"use server";
import Stripe from 'stripe';
import { z } from "zod";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { eq } from 'drizzle-orm';
import { users } from '@/schema/schema';

const db = drizzle(sql);

export async function create_checkout_session(prevState: any, formData: FormData) {
    async function getSessionUrl() {
        const stripe = new Stripe("sk_test_51OUni6KO87GEImsyMm1mtLcaXJlDknUUdtyd4ewl9nDJ1tUBQXmcRqpbg7IIFI4ZF0oqXwOSPEx3RDmnmLSctAnb005qrLhuZj", {
            apiVersion: "2023-10-16",
        });

        const planSchema = z.object({
            stripe_lookup_key: z.string().nonempty(),
            successUrl: z.string().nonempty(),
            errorUrl: z.string().nonempty(),
        });
        let planData;
        try {
            planData = planSchema.parse({
                stripe_lookup_key: formData.get("lookup_key"),
                successUrl: formData.get("successUrl"),
                errorUrl: formData.get("errorUrl"),
            });
        } catch (error) {
            console.error("Validation error: ", error);
            return { success: false, error: "Data validation failed" };
        }

        try {
            const prices = await stripe.prices.list({
                lookup_keys: [planData.stripe_lookup_key],
                expand: ['data.product'],
            });
            const token = cookies().get("token")?.value;
            const decoded = await jwt.verify(token, process.env.JWT_SECRET);
            const userEmail = decoded.email_addr;
            const session = await stripe.checkout.sessions.create({
                billing_address_collection: 'auto',
                line_items: [
                    {
                        price: prices.data[0].id,
                        // For metered billing, do not pass quantity
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${process.env.BASE_URL + planData.successUrl}`,
                cancel_url: `${process.env.BASE_URL + planData.errorUrl}`,
                customer_email: userEmail,
            });


            const sessionurl = session.url;
            return { success: true, sessionurl };
        } catch (error) {
            console.error("Post creation error: ", error);
            //@ts-ignore
            return { success: false, error: error.message };
        }
    }
    const sessionUrl = await getSessionUrl();
    if (sessionUrl.success) {
        // Retrieve the existing token from cookies
        const existingToken = cookies().get("token")?.value;
        if (!existingToken) {
            return { success: false, error: "Token not found" };
        }

        // Decode the existing token
        const decodedToken = jwt.decode(existingToken);
        if (!decodedToken || typeof decodedToken === 'string') {
            return { success: false, error: "Invalid token" };
        }

        // Manually set the exp field to the desired expiry timestamp
        const updatedTokenPayload = {
            ...decodedToken, 
            setpayment: true,
            exp: decodedToken.exp // Keep the original expiration time
        };

        // Sign the new token without specifying expiresIn
        const updatedToken = jwt.sign(updatedTokenPayload, process.env.JWT_SECRET);

        // Set the updated token in cookies
        cookies().set({
            name: 'token',
            value: updatedToken,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV !== 'development',
            maxAge: decodedToken.exp - Math.floor(Date.now() / 1000), // Remaining time in seconds
            sameSite: 'lax',
        });

        // Update the user in the database
        await db.update(users)
            .set({
                setpayment: true,
                // Optionally, store the updated token in the database if needed
                // token: updatedToken 
            })
            .where(eq(users.uuid, decodedToken.uuid));

        // Redirect to the session URL
        //@ts-ignore
        redirect(sessionUrl.sessionurl);
    } else {
        return sessionUrl;
    }

}

export async function continueWithFreePlan() {
        // Retrieve the existing token from cookies
        const existingToken = cookies().get("token")?.value;
        if (!existingToken) {
            return { success: false, error: "Token not found" };
        }

        // Decode the existing token
        const decodedToken = jwt.decode(existingToken);
        if (!decodedToken || typeof decodedToken === 'string') {
            return { success: false, error: "Invalid token" };
        }

        // Manually set the exp field to the desired expiry timestamp
        const updatedTokenPayload = {
            ...decodedToken, 
            setpayment: true,
            exp: decodedToken.exp // Keep the original expiration time
        };

        // Sign the new token without specifying expiresIn
        const updatedToken = jwt.sign(updatedTokenPayload, process.env.JWT_SECRET);

        // Set the updated token in cookies
        cookies().set({
            name: 'token',
            value: updatedToken,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV !== 'development',
            maxAge: decodedToken.exp - Math.floor(Date.now() / 1000), // Remaining time in seconds
            sameSite: 'lax',
        });

        // Update the user in the database
        await db.update(users)
            .set({
                setpayment: true,
                // Optionally, store the updated token in the database if needed
                // token: updatedToken 
            })
            .where(eq(users.uuid, decodedToken.uuid));

        // Redirect to the session URL
        //@ts-ignore
        redirect("/dashboard");
}
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
});

export async function create_checkout_session(prevState: any, formData: FormData) {
    async function getSessionUrl() {

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
            const customerId = decoded.customerId;
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
                customer: customerId,
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
        const decodedToken = jwt.verify(existingToken, process.env.JWT_SECRET);
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
    const decodedToken = jwt.verify(existingToken, process.env.JWT_SECRET);
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

export async function manageAccount() {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const customerId = decodedToken.customerId;
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.BASE_URL}/dashboard`,
    });
    redirect(session.url);
}



export async function getSubscriptionStatus() {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const customerId = decodedToken.customerId;
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            expand: ['data.default_payment_method'],
        });

        if (subscriptions.data.length > 0) {
            // Пример: извличане на състоянието на първия абонамент
            const subscription = subscriptions.data[0];
            return {
                status: subscription.status,
                plan: subscription.items.data[0].price.lookup_key,
                // Друга полезна информация може да бъде добавена тук
            };
        } else {
            console.log('No subscriptions found for this customer.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching subscription from Stripe:', error);
        return null;
    }
}
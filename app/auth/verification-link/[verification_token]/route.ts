import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { users } from '../../../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

async function decodeVerificationToken(verification_token: any) {
    try {
        const decoded_verification_token = await jwt.verify(verification_token, process.env.JWT_SECRET);
        return decoded_verification_token;
    } catch (error) {
        console.log("Error decoding verification token:", error)
        return null;
    }
}

async function decodeAuthToken(auth_token:any) {
    try {
        const decoded_auth_token = await jwt.verify(auth_token, process.env.JWT_SECRET);
        return decoded_auth_token;
    } catch (error) {
        console.log("Error decoding auth token:", error)
        return null;
    }
}

async function editAuthToken(decoded_auth_token: any) {
    const uuid = decoded_auth_token.uuid;
    const email_addr = decoded_auth_token.email_addr;
    const updatedAuthToken = jwt.sign({ uuid: uuid, email_verified: true, email_addr: email_addr }, process.env.JWT_SECRET, { expiresIn: '1h' });
    cookies().set({
        name: 'token',
        value: updatedAuthToken,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 3600,
        sameSite: 'strict',
    });
}

export async function GET(request: NextRequest, { params }: { params: { verification_token: string } }) {
    const cookieStore = cookies();
    const verification_token = params.verification_token;
    const decoded_verification_token = await decodeVerificationToken(verification_token);
    if (!decoded_verification_token) {
        return NextResponse.json({ status: 401, message: "Verification link is expired or wrong." })
    }

    const db = drizzle(sql);
    const userQueryResult = await db.select({
        email_verified: users.email_verified
    })
        .from(users)
        .where(eq(users.email, decoded_verification_token.email))
        .execute();
    if (userQueryResult[0].email_verified) {
        redirect("/dashboard")
    }
    const auth_token = request.cookies.get('token')?.value;
    const decoded_auth_token = await decodeAuthToken(auth_token);
   
    if (decoded_auth_token) {
        await editAuthToken(decoded_auth_token);
    }

    await db.update(users)
        .set({ email_verified: true, verification_token: null })
        .where(eq(users.email, decoded_verification_token.email));

    redirect("/dashboard");
    return NextResponse.json({ status: 200 });
}
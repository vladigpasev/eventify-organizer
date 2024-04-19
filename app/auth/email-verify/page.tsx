import React from 'react';
//@ts-ignore
import jwt from "jsonwebtoken";
import { cookies } from 'next/headers';
import SendMailBtn from '@/components/SendMailBtn';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { users } from '../../../schema/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import LogoutBtn from '@/components/LogoutBtn';

const db = drizzle(sql);

async function decodeToken() {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.log(error)
        return null;
    }
}

async function EmailVerify() {
    const decoded = await decodeToken();
    if (!decoded) {
        redirect('/auth/login');
    }
    const email = decoded.email_addr;
    const uuid = decoded.uuid;

    const userQueryResult = await db.select({
        sentVerification: users.sentVerification,
        email_verified: users.email_verified,
        lastEmailSentAt: users.lastEmailSentAt // Fetch the lastEmailSentAt timestamp
    })
        .from(users)
        .where(eq(users.uuid, uuid))
        .execute();

    if (userQueryResult[0]?.email_verified) {
        redirect('/dashboard');
    }

    const isVerificationSent = userQueryResult.length > 0 && userQueryResult[0]?.sentVerification;
    const lastEmailSentAt = new Date(userQueryResult[0]?.lastEmailSentAt || 0);
    const currentTime = new Date();
    //@ts-ignore
    const remainingTime = Math.max(60 - Math.ceil((currentTime - lastEmailSentAt) / 1000), 0); // Calculate remaining time in seconds

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <LogoutBtn />
            <div className="bg-white shadow-xl rounded-lg p-6 max-w-sm w-full">
                <h1 className="text-2xl font-semibold text-gray-800">Потвърди мейла си</h1>
                {isVerificationSent ? (
                    <p className="text-gray-600 mt-2">Връзката за потвърждение вече е изпратена на имейла ви. Ако нямате такава, моля, свържете се с поддръжката на Eventify или опитайте да я изпратите отново.</p>
                ) : (
                    <p className="text-gray-600 mt-2">Последната стъпка, за да завършите създаването на акаунта си, е да потвърдите имейл адреса си.</p>
                )}
                <div className="mt-2 bg-blue-100 text-blue-800 p-3 rounded">
                    {email}
                </div>
                <SendMailBtn email={email} initialCountdown={remainingTime} />
            </div>
        </div>
    )
}

export default EmailVerify;
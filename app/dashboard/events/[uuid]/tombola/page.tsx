import React from 'react';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from "drizzle-orm";
import { events, sellers, users } from '../../../../../schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation';
import TombolaTable from '../../../../../components/ManageEvent/TombolaTable';
import Link from 'next/link';
import TombolaItemsTable from '@/components/ManageEvent/TombolaItemsTable';

export const maxDuration = 300;

const db = drizzle(sql);

const isValidUUID = (uuid: any) => {
    const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regexExp.test(uuid);
}

async function EventManagementPage({ params }: { params: { uuid: string } }) {
    if (!isValidUUID(params.uuid)) {
        notFound();
        return;
    }

    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    const currentUserDb = await db
        .select({
            email: users.email,
        })
        .from(users)
        .where(eq(users.uuid, userUuid))
        .execute();
    const currentUser = currentUserDb[0];

    const currentEventDb = await db.select({
        eventName: events.eventName,
        userUuid: events.userUuid,
        description: events.description,
        thumbnailUrl: events.thumbnailUrl,
        dateTime: events.dateTime,
        location: events.location,
        price: events.price,
        isFree: events.isFree,
        visibility: events.visibility,
    })
        .from(events)
        .where(eq(events.uuid, params.uuid))
        .execute();

    if (currentEventDb.length === 0) {
        notFound();
        return;
    }

    const currentEvent = currentEventDb[0];

    const sellersDb = await db.select({
        sellerEmail: sellers.sellerEmail,
    })
        .from(sellers)
        .where(eq(sellers.eventUuid, params.uuid))
        .execute();

    const sellerEmails = sellersDb.map(seller => seller.sellerEmail);

    let isSeller;
    if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
        notFound();
        return;
    } else if (sellerEmails.includes(currentUser.email)) {
        isSeller = true;
    }

    return (

        <div className="container mx-auto p-4">
            <div>
                <a href={`/dashboard/events/${params.uuid}`} className='btn'>Обратно към събитие</a>
                <h1 className="text-2xl font-bold mb-4 text-black">
                    {currentEvent.eventName} - томбола
                </h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white shadow rounded p-4 text-black">
                <TombolaItemsTable eventId={params.uuid} isSeller={isSeller} userUuid={userUuid} />
                </div>
                <TombolaTable eventId={params.uuid} isSeller={isSeller} userUuid={userUuid} />
            </div>
        </div>
    );
}

export default EventManagementPage;

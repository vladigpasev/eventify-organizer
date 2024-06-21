"use server"
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { tombolaItems, events, users, sellers, eventCustomers } from '../../schema/schema';
import { and, eq, inArray } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const db = drizzle(sql);

interface TombolaItem {
    uuid: string;
    itemName: string;
    winnerUuid: string;
}

export async function addTombolaItem(data: any) {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    // Define a schema for validating the tombola item data
    const tombolaItemSchema = z.object({
        itemName: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });

    try {
        const validatedData = tombolaItemSchema.parse(data);

        const currentEventDb = await db.select({
            userUuid: events.userUuid,
        })
            .from(events)
            .where(eq(events.uuid, validatedData.eventUuid))
            .execute();
        const currentEvent = currentEventDb[0];

        if (!currentEvent || currentEvent.userUuid !== userUuid) {
            throw new Error('Unauthorized or event not found');
        }

        // Insert the new tombola item into the database
        await db.insert(tombolaItems).values({
            itemName: validatedData.itemName,
            eventUuid: validatedData.eventUuid,
        }).execute();

        return { success: true };
    } catch (error) {
        console.error('Error adding tombola item:', error);
        //@ts-ignore
        return { success: false, message: error.message };
    }
}
export async function getTombolaItems(eventUuid: string): Promise<TombolaItem[]> {
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
        .where(eq(events.uuid, eventUuid))
        .execute();
    const currentEvent = currentEventDb[0];

    const sellersEmailsDb = await db.select({
        sellerEmail: sellers.sellerEmail,
    })
        .from(sellers)
        .where(eq(sellers.eventUuid, eventUuid))
        .execute();

    const sellerEmails = sellersEmailsDb.map(seller => seller.sellerEmail);

    if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
        throw new Error("Unauthorized");
    }

    const tombolaItemsDb = await db.select({
        uuid: tombolaItems.uuid,
        itemName: tombolaItems.itemName,
        winnerUuid: tombolaItems.winnerUuid,
    })
        .from(tombolaItems)
        .where(eq(tombolaItems.eventUuid, eventUuid))
        .execute();

    const winnerUuids = tombolaItemsDb.map(item => item.winnerUuid).filter(uuid => uuid);

    let winnerMap: Record<string, string> = {};

    if (winnerUuids.length > 0) {
        const winnerDetailsDb = await db.select({
            uuid: eventCustomers.uuid,
            firstname: eventCustomers.firstname,
            lastname: eventCustomers.lastname,
        })
            .from(eventCustomers)
            //@ts-ignore
            .where(inArray(eventCustomers.uuid, winnerUuids))
            .execute();

        winnerMap = winnerDetailsDb.reduce((map, user) => {
            //@ts-ignore
            map[user.uuid] = `${user.firstname} ${user.lastname}`;
            return map;
        }, {} as Record<string, string>);
    }

    const formattedItems = tombolaItemsDb.map(item => ({
        ...item,
        winnerName: item.winnerUuid ? winnerMap[item.winnerUuid] : 'няма',
    }));
    //@ts-ignore
    return formattedItems;
}

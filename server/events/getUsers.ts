"use server"
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and } from "drizzle-orm";
import { eventCustomers, events } from '@/schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'

const db = drizzle(sql);

interface Customer {
    uuid: string;
    firstname: string;
    lastname: string;
    email: string;
    guestCount: number;
    ticketToken: string;
    isEntered: boolean;
    createdAt: string;
}

export async function getUsers(eventUuid: string): Promise<Customer[]> {

    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

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

    if (userUuid != currentEvent.userUuid) {
        throw "Unauthorized";
    }

    const currentCustomerDb = await db.select({
        uuid: eventCustomers.uuid,
        firstname: eventCustomers.firstname,
        lastname: eventCustomers.lastname,
        email: eventCustomers.email,
        guestCount: eventCustomers.guestCount,
        ticketToken: eventCustomers.ticketToken,
        isEntered: eventCustomers.isEntered,
        paperTicket: eventCustomers.paperTicket,
        createdAt: eventCustomers.createdAt,
    })
        .from(eventCustomers)
        .where(and(
            eq(eventCustomers.eventUuid, eventUuid),
            eq(eventCustomers.hidden, false)
        ))
        .orderBy(eventCustomers.firstname)
        .execute();

    // Format createdAt to dd.mm.YYYY, HH:mm:ss format in Sofia's time zone
    const formattedCustomers = currentCustomerDb.map(customer => {
        const createdAt = new Date(customer.createdAt);
        const options = { 
            timeZone: 'Europe/Sofia', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        };
        const formattedCreatedAt = createdAt.toLocaleString('en-GB', options).replace(',', '');

        return {
            ...customer,
            createdAt: formattedCreatedAt,
        };
    });
    
    return formattedCustomers;
}

'use server';
import { z } from 'zod';
//@ts-ignore
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers } from '../../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';

const db = drizzle(sql);

export async function checkTicket(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        qrData: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.qrData;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        const customerUuid = decodedTicketToken.uuid;
        const currentCustomerDb = await db.select({
            firstName: eventCustomers.firstname,
            lastName: eventCustomers.lastname,
            email: eventCustomers.email,
            guestCount: eventCustomers.guestCount,
            eventUuid: eventCustomers.eventUuid,
            isEntered: eventCustomers.isEntered,
        })
            .from(eventCustomers)
            .where(eq(eventCustomers.uuid, customerUuid))
            .execute();
        const currentCustomer = currentCustomerDb[0];

        if (currentCustomer.eventUuid !== validatedData.eventUuid) {
            return ({ success: false });
        }
        return ({ success: true, currentCustomer });
    } catch (err) {
        console.log(err)
        return ({ success: false });

    }
}


export async function markAsEntered(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        ticketToken: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.ticketToken;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        const customerUuid = decodedTicketToken.uuid;
        await db.update(eventCustomers)
            .set({
                isEntered: true,
            })
            .where(eq(eventCustomers.uuid, customerUuid));

        return ({ success: true });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}

export async function markAsExited(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        ticketToken: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.ticketToken;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        const customerUuid = decodedTicketToken.uuid;
        await db.update(eventCustomers)
            .set({
                isEntered: false,
            })
            .where(eq(eventCustomers.uuid, customerUuid));

        return ({ success: true });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}
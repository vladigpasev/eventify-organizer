//Copyright (C) 2024  Vladimir Pasev
'use server';
import { z } from 'zod';
//@ts-ignore
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers, paperTickets } from '../../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';

const db = drizzle(sql);

export async function checkPaperToken(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        eventUuid: z.string().nonempty(),
        token: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.token;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        const paperUuid = decodedTicketToken.uuid;
        const currentPaperTicketDb = await db.select({
            eventUuid: paperTickets.eventUuid,
            assignedCustomer: paperTickets.assignedCustomer,
            nineDigitCode: paperTickets.nineDigitCode,
        })
            .from(paperTickets)
            .where(eq(paperTickets.uuid, paperUuid))
            .execute();
        const currentCustomer = currentPaperTicketDb[0];

        if (currentCustomer.eventUuid !== validatedData.eventUuid) {
            return ({ success: false });
        }

        if(currentCustomer.assignedCustomer){
            return ({ success: false });
        }
        
        return ({ success: true, currentCustomer });
    } catch (err) {
        console.log(err)
        return ({ success: false });

    }
}
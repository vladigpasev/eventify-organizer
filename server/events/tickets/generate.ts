'use server';
import { z } from 'zod';
//@ts-ignore
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers } from '../../../schema/schema';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
//@ts-ignore
import nodemailer from 'nodemailer';
import { redirect } from 'next/navigation';

const db = drizzle(sql);

export async function createManualTicket(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        firstname: z.string().nonempty(),
        lastname: z.string().nonempty(),
        email: z.string().nonempty(),
        guestsCount: z.any(),
        eventUuid: z.string().nonempty(),
        // No need to include userUuid here as it's obtained from the token
    });
    // const token = cookies().get("token")?.value;
    // const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    // const userUuid = decodedToken.uuid;

    try {
        const validatedData = ticketSchema.parse(data);

        // Insert the data into the database and retrieve the uuid
        const insertResult = await db.insert(eventCustomers).values({
            firstname: validatedData.firstname,
            lastname: validatedData.lastname,
            email: validatedData.email,
            guestCount: validatedData.guestsCount,
            eventUuid: validatedData.eventUuid,
        }).returning({ uuid: eventCustomers.uuid }).execute();

        // Assuming the first element of the array is the inserted row
        const customerUuid = insertResult[0]?.uuid;

        // Generate a ticket token using the retrieved uuid
        const ticketToken = jwt.sign({ uuid: customerUuid }, process.env.JWT_SECRET);

        // Update the record with the ticket token
        await db.update(eventCustomers)
            .set({
                ticketToken,
            })
            //@ts-ignore
            .where(eq(eventCustomers.uuid, customerUuid));
        return { success: true, message: 'Event created successfully', customerUuid, ticketToken };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event creation failed' };
    }

}

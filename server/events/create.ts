'use server';
import { z } from 'zod';
//@ts-ignore
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { events, users } from '../../schema/schema';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
//@ts-ignore
import nodemailer from 'nodemailer';
import { redirect } from 'next/navigation';

const db = drizzle(sql);

export async function createEvent(data: any) {
    // Define a schema for event data validation
    const eventSchema = z.object({
        eventName: z.string(),
        category: z.string(),
        description: z.string(),
        thumbnailUrl: z.string(),
        location: z.string(),
        isFree: z.boolean(),
        price: z.any(),
        dateTime: z.string().refine(
            (dateString) => {
                const date = new Date(dateString);
                return !isNaN(date.getTime()) && date > new Date();
            },
            {
                message: "DateTime must be a valid future date and time.",
            }
        ),
        // No need to include userUuid here as it's obtained from the token
    });
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    try {
        const validatedData = eventSchema.parse(data);

        // Combine validated data with userUuid
        const eventData = {
            ...validatedData,
            userUuid: userUuid
        };

        const result = await db.insert(events).values(eventData).execute();
        return { success: true, message: 'Event created successfully' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event creation failed' };
    }
}

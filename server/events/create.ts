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
        price: z.number(),
    });
    let eventData: InferInsertModel<typeof events>;
    try {
        eventData = eventSchema.parse(data);
    } catch (error) {
        console.error("Validation error: ", error);
        return { success: false, error: "Data validation failed" };
    }

    try {
        const result = await db.insert(events).values(eventData).execute();
        return { success: true, message: 'Event created successfully' };
    } catch (error) {
        console.error('Event creation failed:', error);
        return { success: false, message: 'Event creation failed' };
    }
}


export async function editEvent(data:any) {
    return { message: "Coming soon" }

}
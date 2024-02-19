//Copyright (C) 2024  Vladimir Pasev
'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { events } from '../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
import { getSubscriptionStatus } from '../payment/plan';

const db = drizzle(sql);

export async function createEvent(data: any) {
    // Define a schema for event data validation
    const eventSchema = z.object({
        eventName: z.string().nonempty(),
        category: z.string().nonempty(),
        description: z.string().nonempty(),
        thumbnailUrl: z.string().nonempty(),
        location: z.string().nonempty(),
        isFree: z.boolean(),
        price: z.any(),
        visibility: z.string().nonempty(),
        dateTime: z.string().nonempty().refine(
            (dateString) => {
                const date = new Date(dateString);
                return !isNaN(date.getTime()) && date > new Date();
            },
            {
                message: "DateTime must be a valid future date and time.",
            }
        ),
    });
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;
    const userPlan = await getSubscriptionStatus();

    let subscriptionPlan;
    if (userPlan && userPlan.status === 'active') {
        subscriptionPlan = userPlan.plan;
        console.log(subscriptionPlan);
    } else {
        subscriptionPlan = 'hobby';
    }

    switch (subscriptionPlan) {
        case 'hobby':
            const eventsQueryResultHobby = await db.select()
                .from(events)
                .where(eq(events.userUuid, userUuid))
                .execute();
            if (eventsQueryResultHobby.length >= 5) {
                return { success: false, message: 'You are currently with a hobby plan. You can create up to 5 events. Please upgrade your plan or delete old events to create more!' };
            } else {
                //User can create more events
            }
            break;
        case 'basic_plan':
            const eventsQueryResultBasic = await db.select()
                .from(events)
                .where(eq(events.userUuid, userUuid))
                .execute();
            if (eventsQueryResultBasic.length >= 20) {
                return { success: false, message: 'You are currently with a basic plan. You can create up to 20 events. Please upgrade your plan or delete old events to create more!' };
            } else {
                //User can create more events
            }
            break;
        case 'premium_plan':
            break;
        default:
            const eventsQueryResultNoPlan = await db.select()
                .from(events)
                .where(eq(events.userUuid, userUuid))
                .execute();
            if (eventsQueryResultNoPlan.length >= 5) {
                return { success: false, message: 'Please upgrade your plan' };
            } else {
                //User can create more events
            }
            break;
    }

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

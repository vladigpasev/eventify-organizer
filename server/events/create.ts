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

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function geocodeLocation(address: any) {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;

    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        //@ts-ignore
        if (data.results && data.results.length > 0) {
            //@ts-ignore
            const { lat, lng } = data.results[0].geometry.location;
            //console.log("Geocoding result for", address, ":", { lat, lng });
            return { lat, lng };
        } else {
            console.error('No results found for location:', address);
            return null;
        }
    } catch (error) {
        console.error('Error in geocoding:', error);
        return null;
    }
}

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
                return { success: false, message: 'Понастоящем сте с hobby план. Можете да създавате до 5 събития. Моля, надградете плана си или изтрийте стари събития, за да създадете повече!' };
            } else {
                //User can create more events
            }
            break;
        case 'basic_plan_month' || 'basic_plan_year':
            const eventsQueryResultBasic = await db.select()
                .from(events)
                .where(eq(events.userUuid, userUuid))
                .execute();
            if (eventsQueryResultBasic.length >= 15) {
                return { success: false, message: 'Понастоящем сте с basic план. Можете да създавате до 15 събития. Моля, надградете плана си или изтрийте стари събития, за да създадете повече!' };
            } else {
                //User can create more events
            }
            break;
        case 'premium_plan_month' || 'premium_plan_year':
            break;
        default:
            const eventsQueryResultNoPlan = await db.select()
                .from(events)
                .where(eq(events.userUuid, userUuid))
                .execute();
            if (eventsQueryResultNoPlan.length >= 5) {
                return { success: false, message: 'Понастоящем сте с hobby план. Можете да създавате до 5 събития. Моля, надградете плана си или изтрийте стари събития, за да създадете повече!' };
            } else {
                //User can create more events
            }
            break;
    }

    try {
        const validatedData = eventSchema.parse(data);
        const coordinates = await geocodeLocation(validatedData.location);
        // Combine validated data with userUuid
        const eventData = {
            ...validatedData,
            userUuid: userUuid,
            eventCoordinates: coordinates,
        };
        //@ts-ignore
        const result = await db.insert(events).values(eventData).execute();
        return { success: true, message: 'Event created successfully' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event creation failed' };
    }
}

//Copyright (C) 2024  Vladimir Pasev
'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers, events } from '../../schema/schema';
import { eq } from 'drizzle-orm';

const db = drizzle(sql);

export async function editTitle(data: any) {
    const titleSchema = z.object({
        uuid: z.string().nonempty(),
        title: z.string().nonempty(),
    });
    try {
        const validatedData = titleSchema.parse(data);

        await db.update(events)
            .set({
                eventName: validatedData.title,
            })
            .where(eq(events.uuid, validatedData.uuid));
        console.log(validatedData.title);
        return { success: true, message: 'Event title updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event title edit failed.' };
    }

}

export async function editDescription(data: any) {
    const descriptionSchema = z.object({
        uuid: z.string().nonempty(),
        description: z.string().nonempty(),
    });
    try {
        const validatedData = descriptionSchema.parse(data);

        await db.update(events)
            .set({
                description: validatedData.description,
            })
            .where(eq(events.uuid, validatedData.uuid));
        console.log(validatedData.description);
        return { success: true, message: 'Event description updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event description edit failed.' };
    }

}

export async function editThumbnail(data: any) {
    const thumbnailSchema = z.object({
        uuid: z.string().nonempty(),
        thumbnailUrl: z.string().nonempty(),
    });
    try {
        const validatedData = thumbnailSchema.parse(data);

        await db.update(events)
            .set({
                thumbnailUrl: validatedData.thumbnailUrl,
            })
            .where(eq(events.uuid, validatedData.uuid));
        console.log(validatedData.thumbnailUrl);
        return { success: true, message: 'Event thumbnail updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event thumbnail edit failed.' };
    }

}

export async function editDateTime(data: any) {
    const dateTimeSchema = z.object({
        uuid: z.string().nonempty(),
        dateTime: z.string().nonempty().refine(
            (dateString) => {
                const date = new Date(dateString);
                return !isNaN(date.getTime()) && date > new Date();
            },
            {
                message: "DateTime must be a valid future date and time.",
            }
        )
    });
    try {
        const validatedData = dateTimeSchema.parse(data);

        await db.update(events)
            .set({
                dateTime: validatedData.dateTime,
            })
            .where(eq(events.uuid, validatedData.uuid));
        console.log(validatedData.dateTime);
        return { success: true, message: 'Event date and time updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event date and time edit failed.' };
    }

}


export async function editLocation(data: any) {
    const locationSchema = z.object({
        uuid: z.string().nonempty(),
        location: z.string().nonempty(),
    });
    try {
        const validatedData = locationSchema.parse(data);

        await db.update(events)
            .set({
                location: validatedData.location,
            })
            .where(eq(events.uuid, validatedData.uuid));
        console.log(validatedData.location);
        return { success: true, message: 'Event location updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event location edit failed.' };

    }
}

export async function editPrice(data: any) {
    const priceSchema = z.object({
        uuid: z.string().nonempty(),
        price: z.any(),
    });
    try {
        const validatedData = priceSchema.parse(data);
        if(validatedData.price>0){
            await db.update(events)
            .set({
                price: validatedData.price,
                isFree: false,
            })
            .where(eq(events.uuid, validatedData.uuid));
        }else{
            await db.update(events)
            .set({
                price: validatedData.price,
                isFree: true,
            })
            .where(eq(events.uuid, validatedData.uuid));
        }

        
        console.log(validatedData.price);
        return { success: true, message: 'Event location updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event location edit failed.' };

    }
}

export async function changeVisibility(data: any) {
    const visibilitySchema = z.object({
        uuid: z.string().nonempty(),
        visibility: z.enum(['public', 'private']),
    });

    try {
        const validatedData = visibilitySchema.parse(data);

        await db.update(events)
            .set({
                visibility: validatedData.visibility,
            })
            .where(eq(events.uuid, validatedData.uuid));

        console.log(`Visibility changed to ${validatedData.visibility} for event ${validatedData.uuid}`);
        return { success: true, message: 'Event visibility updated successfully!' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event visibility edit failed.' };
    }
}
//@ts-ignore
export async function deleteEvent(eventUuid) {
    try {
        await db.delete(events).where(eq(events.uuid, eventUuid));
        await db.delete(eventCustomers).where(eq(eventCustomers.eventUuid, eventUuid));
        return { success: true };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Event deletion failed.' };
    }
}
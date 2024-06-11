// /server/events/limitActions.ts

'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { events } from '../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const db = drizzle(sql);

export async function getCurrentLimit(data: any) {
  const limitSchema = z.object({
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = limitSchema.parse(data);

    const currentEventDb = await db.select({
      limit: events.limit,
    })
      .from(events)
      .where(eq(events.uuid, validatedData.eventUuid))
      .execute();

    return currentEventDb[0];
  } catch (error) {
    console.log(error);
    return { limit: null };
  }
}

export async function changeLimit(data: any) {
  const limitSchema = z.object({
    limit: z.any(),
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = limitSchema.parse(data);
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    const currentEventDb = await db.select({
      eventName: events.eventName,
      userUuid: events.userUuid,
    })
      .from(events)
      .where(eq(events.uuid, validatedData.eventUuid))
      .execute();
    const currentEvent = currentEventDb[0];

    if (currentEvent.userUuid !== userUuid) {
      return { success: false, message: 'Не сте създател на това събитие!' };
    }

    await db.update(events)
      .set({
        limit: validatedData.limit ? validatedData.limit : null,
      })
      .where(eq(events.uuid, validatedData.eventUuid));

    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при промяната на лимита!' };
  }
}

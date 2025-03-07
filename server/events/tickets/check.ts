'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

import {
  events,
  eventCustomers,
  paperTickets,
  users,
  faschingRequests,
  faschingTickets
} from '../../../schema/schema';
import { eq, gt, and } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const db = drizzle(sql);

const FASCHING_EVENT_UUID = '956b2e2b-2a48-4f36-a6fa-50d25a2ab94d';

/**
 * Проверка на билет (QR Data или Barcode).
 * Ако е фашинг (eventUuid = FASCHING_EVENT_UUID) -> търсим ticketCode във fasching_tickets.
 * Иначе -> декодираме JWT (eventCustomers).
 */
export async function checkTicket(data: any) {
  const schema = z.object({
    qrData: z.string().min(1), // ticketCode (Fasching) или JWT (стандартно събитие)
    eventUuid: z.string().min(1),
    mode: z.enum(['fasching', 'after']).optional(),
  });

  const { qrData, eventUuid, mode } = schema.parse(data);
  const isFasching = (eventUuid === FASCHING_EVENT_UUID);

  try {
    if (isFasching) {
      // Търсим ред във fasching_tickets, където ticketCode = qrData
      const ticketsRes = await db
        .select()
        .from(faschingTickets)
        .where(eq(faschingTickets.ticketCode, qrData))
        .execute();
      const fTicket = ticketsRes[0];
      if (!fTicket) {
        return { success: false };
      }

      // Ако ticketType = 'fasching', но mode='after' => невалиден
      const actualMode = mode || "fasching";
      if (fTicket.ticketType === 'fasching' && actualMode === 'after') {
        return { success: false };
      }

      // Подготвяме отговор
      const response = {
        requestedToken: qrData,            // за markAsEntered / paySepare
        ticketType: fTicket.ticketType,    // 'fasching' | 'fasching-after'
        guestFirstName: fTicket.guestFirstName,
        guestLastName: fTicket.guestLastName,
        guestEmail: fTicket.guestEmail,
        entered_fasching: fTicket.entered_fasching,
        entered_after: fTicket.entered_after,

        // Колони за сепаре
        owesForSepare: fTicket.owesforsepare,
        separeSellerId: fTicket.separesellerid,
      };
      return { success: true, response };
    }

    // НЕ-фашинг => стандартен декодиран JWT
    const decoded: any = jwt.verify(qrData, process.env.JWT_SECRET);

    let customerUuid: string;
    let nineDigitCode: string | undefined;

    if (decoded.paper) {
      // Хартиен билет => търсим в paperTickets
      const paperDb = await db
        .select({
          assignedCustomer: paperTickets.assignedCustomer,
          nineDigitCode: paperTickets.nineDigitCode,
        })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, decoded.uuid))
        .execute();
      const pRow = paperDb[0];
      if (!pRow) return { success: false };
      customerUuid = pRow.assignedCustomer;
      nineDigitCode = pRow.nineDigitCode;
    } else {
      customerUuid = decoded.uuid;
    }

    const customerDb = await db
      .select({
        firstName: eventCustomers.firstname,
        lastName: eventCustomers.lastname,
        email: eventCustomers.email,
        guestCount: eventCustomers.guestCount,
        eventUuid: eventCustomers.eventUuid,
        isEntered: eventCustomers.isEntered,
        createdAt: eventCustomers.createdAt,
        sellerUuid: eventCustomers.sellerUuid,
        reservation: eventCustomers.reservation,
        tombola_weight: eventCustomers.tombola_weight,
      })
      .from(eventCustomers)
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();
    const currentCustomer = customerDb[0];
    if (!currentCustomer) {
      return { success: false };
    }

    // Проверка за същия event
    if (currentCustomer.eventUuid !== eventUuid) {
      return { success: false };
    }

    // Можем да върнем и друга полезна информация:
    let sellerName: string | null = null;
    let sellerEmail: string | null = null;
    if (currentCustomer.sellerUuid) {
      const userDb = await db
        .select({
          firstName: users.firstname,
          lastName: users.lastname,
          email: users.email,
        })
        .from(users)
        .where(eq(users.uuid, currentCustomer.sellerUuid))
        .execute();
      const sRow = userDb[0];
      if (sRow) {
        sellerName = `${sRow.firstName} ${sRow.lastName}`;
        sellerEmail = sRow.email;
      }
    }

    // Форматираме createdAt
    //@ts-ignore
    const dateVal = new Date(currentCustomer.createdAt);
    const options = {
      timeZone: 'Europe/Sofia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    } as const;
    //@ts-ignore
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(dateVal);
    const formatted = `${parts[0].value}.${parts[2].value}.${parts[4].value}, ${parts[6].value}:${parts[8].value}:${parts[10].value}`;

    return {
      success: true,
      response: {
        requestedToken: qrData,
        nineDigitCode,
        firstName: currentCustomer.firstName,
        lastName: currentCustomer.lastName,
        email: currentCustomer.email,
        guestCount: currentCustomer.guestCount,
        isEntered: currentCustomer.isEntered,
        reservation: currentCustomer.reservation,
        tombola_weight: currentCustomer.tombola_weight,
        createdAt: formatted,
        sellerName,
        sellerEmail,
      },
    };
  } catch (err) {
    console.log("checkTicket error:", err);
    return { success: false };
  }
}

/**
 * При фашинг => set entered_fasching/entered_after, 
 * при стандартно => isEntered = true
 */
export async function markAsEntered(data: any) {
  const schema = z.object({
    ticketToken: z.string().min(1),
    eventUuid: z.string().min(1),
    mode: z.enum(['fasching', 'after']).optional(),
  });
  const { ticketToken, eventUuid, mode } = schema.parse(data);

  try {
    const isFasching = (eventUuid === FASCHING_EVENT_UUID);
    if (isFasching) {
      const ftDb = await db
        .select()
        .from(faschingTickets)
        .where(eq(faschingTickets.ticketCode, ticketToken))
        .execute();
      const fTicket = ftDb[0];
      if (!fTicket) return { success: false };

      const actualMode = mode || "fasching";
      if (fTicket.ticketType === 'fasching' && actualMode === 'after') {
        return { success: false };
      }

      if (actualMode === 'fasching') {
        await db.update(faschingTickets)
          .set({ entered_fasching: true })
          .where(eq(faschingTickets.id, fTicket.id))
          .execute();
      } else {
        await db.update(faschingTickets)
          .set({ entered_after: true })
          .where(eq(faschingTickets.id, fTicket.id))
          .execute();
      }
      return { success: true };
    }

    // Стандартно събитие => разкодиране на JWT
    const decoded: any = jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid: string;

    if (decoded.paper) {
      const paperDb = await db.select({ assignedCustomer: paperTickets.assignedCustomer })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, decoded.uuid))
        .execute();
      const pRow = paperDb[0];
      if (!pRow) return { success: false };
      customerUuid = pRow.assignedCustomer;
    } else {
      customerUuid = decoded.uuid;
    }

    await db.update(eventCustomers)
      .set({ isEntered: true })
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();

    return { success: true };
  } catch (err) {
    console.log("markAsEntered error:", err);
    return { success: false };
  }
}

/**
 * При фашинг => зануляваме entered_fasching/entered_after, 
 * при стандартно => isEntered = false
 */
export async function markAsExited(data: any) {
  const schema = z.object({
    ticketToken: z.string().min(1),
    eventUuid: z.string().min(1),
    mode: z.enum(['fasching', 'after']).optional(),
  });
  const { ticketToken, eventUuid, mode } = schema.parse(data);

  try {
    const isFasching = (eventUuid === FASCHING_EVENT_UUID);
    if (isFasching) {
      const ftDb = await db
        .select()
        .from(faschingTickets)
        .where(eq(faschingTickets.ticketCode, ticketToken))
        .execute();
      const fTicket = ftDb[0];
      if (!fTicket) return { success: false };

      const actualMode = mode || "fasching";
      if (fTicket.ticketType === 'fasching' && actualMode === 'after') {
        return { success: false };
      }

      if (actualMode === 'fasching') {
        await db.update(faschingTickets)
          .set({ entered_fasching: false })
          .where(eq(faschingTickets.id, fTicket.id))
          .execute();
      } else {
        await db.update(faschingTickets)
          .set({ entered_after: false })
          .where(eq(faschingTickets.id, fTicket.id))
          .execute();
      }
      return { success: true };
    }

    // Стандартно
    const decoded: any = jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid: string;

    if (decoded.paper) {
      const paperDb = await db.select({ assignedCustomer: paperTickets.assignedCustomer })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, decoded.uuid))
        .execute();
      const pRow = paperDb[0];
      if (!pRow) return { success: false };
      customerUuid = pRow.assignedCustomer;
    } else {
      customerUuid = decoded.uuid;
    }

    await db.update(eventCustomers)
      .set({ isEntered: false })
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();

    return { success: true };
  } catch (err) {
    console.log("markAsExited error:", err);
    return { success: false };
  }
}

/**
 * markAsPaid (стандартен event). Fasching не поддържа "markAsPaid".
 */
export async function markAsPaid(data: any) {
  const ticketSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });
  const { ticketToken, eventUuid } = ticketSchema.parse(data);

  // Ако е фашинг, връщаме false
  if (eventUuid === FASCHING_EVENT_UUID) {
    return { success: false };
  }

  const token = cookies().get('token')?.value;
  const decodedSession: any = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedSession.uuid;

  try {
    const decoded: any = jwt.verify(ticketToken, process.env.JWT_SECRET);
    let customerUuid: string;

    if (decoded.paper) {
      const pRes = await db
        .select({ assignedCustomer: paperTickets.assignedCustomer })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, decoded.uuid))
        .execute();
      const row = pRes[0];
      if (!row) return { success: false };
      customerUuid = row.assignedCustomer;
    } else {
      customerUuid = decoded.uuid;
    }

    await db.update(eventCustomers)
      .set({
        reservation: false,
        sellerUuid: userUuid,
      })
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();

    return { success: true };
  } catch (err) {
    console.log('markAsPaid error:', err);
    return { success: false };
  }
}

/**
 * Добавяне в томбола (стандартно). Фашинг не поддържа томбола.
 */
export async function addToRaffle(data: any) {
  const raffleSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
    raffleTickets: z.number().int().positive().max(3),
  });
  const { ticketToken, eventUuid, raffleTickets } = raffleSchema.parse(data);

  if (eventUuid === FASCHING_EVENT_UUID) {
    return { success: false };
  }

  const token = cookies().get('token')?.value;
  const decodedSession: any = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedSession.uuid;

  try {
    const decoded: any = jwt.verify(ticketToken, process.env.JWT_SECRET);

    let customerUuid: string;
    if (decoded.paper) {
      const pRes = await db
        .select({ assignedCustomer: paperTickets.assignedCustomer })
        .from(paperTickets)
        .where(eq(paperTickets.uuid, decoded.uuid))
        .execute();
      const row = pRes[0];
      if (!row) return { success: false };
      customerUuid = row.assignedCustomer;
    } else {
      customerUuid = decoded.uuid;
    }

    await db.update(eventCustomers)
      .set({
        tombola_weight: raffleTickets.toString(),
        tombola_seller_uuid: userUuid,
      })
      .where(eq(eventCustomers.uuid, customerUuid))
      .execute();

    return { success: true };
  } catch (err) {
    console.log('addToRaffle error:', err);
    return { success: false };
  }
}

/**
 * Плащане на дължимото за сепаре (само при Fasching).
 * - Проверява дали owesForSepare > 0, дали не е вече платено (separeSellerId).
 * - Ако amountPaid < дължимото => грешка.
 * - [!! CHANGED] Не зануляваме owesForSepare, за да си седи в базата.
 *   Само записваме separeSellerId, че вече е платено.
 *   Маркираме entered_after=true, ако още не е.
 * - Връща { success, change }
 */
export async function paySepare(data: any) {
  const paySepareSchema = z.object({
    ticketToken: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
    amountPaid: z.number().nonnegative(),
  });
  const { ticketToken, eventUuid, amountPaid } = paySepareSchema.parse(data);

  if (eventUuid !== FASCHING_EVENT_UUID) {
    return { success: false, message: "Това не е Fasching билет." };
  }

  const token = cookies().get('token')?.value;
  if (!token) {
    return { success: false, message: "Няма сесия (token)." };
  }
  const decodedSession: any = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedSession.uuid;

  // Намираме билета
  const ftDb = await db
    .select()
    .from(faschingTickets)
    .where(eq(faschingTickets.ticketCode, ticketToken))
    .execute();
  const fTicket = ftDb[0];
  if (!fTicket) {
    return { success: false, message: "Невалиден билет (няма такъв ticketCode)." };
  }

  if (fTicket.separesellerid) {
    return { success: false, message: "Вече е платено за сепаре при този билет." };
  }

  const owes = parseFloat(fTicket.owesforsepare?.toString() || "0");
  if (owes === 0) {
    return { success: false, message: "Няма дължима сума за сепаре." };
  }

  if (amountPaid < owes) {
    return { success: false, message: "Недостатъчно платена сума." };
  }

  // Рesto
  const change = amountPaid - owes;

  // [!! CHANGED] Вече НЕ зануляваме owesForSepare
  // Оставяме го да си седи, за да се вижда в таблицата.
  // Записваме само, че е платено: separeSellerId
  await db.update(faschingTickets)
    .set({
      // owesforsepare: "0", // махаме зануляването
      separesellerid: userUuid,
    })
    .where(eq(faschingTickets.id, fTicket.id))
    .execute();

  // Ако не е влязъл в after => да го маркираме
  if (!fTicket.entered_after) {
    await db.update(faschingTickets)
      .set({ entered_after: true })
      .where(eq(faschingTickets.id, fTicket.id))
      .execute();
  }

  return { success: true, change };
}

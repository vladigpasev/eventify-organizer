'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import {
  eventCustomers,
  events,
  paperTickets,
  sellers,
  users,
  faschingRequests,
  faschingTickets
} from '../../schema/schema';
import { eq, and, gt } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
//@ts-ignore
import nodemailer from 'nodemailer';
import { cookies } from 'next/headers';

const db = drizzle(sql);

/**
 * Добавя нов продавач в таблицата `sellers`. 
 * - За всяко събитие (без значение дали фашинг или не), продавачите се пазят по имейл.
 * - Изпраща се и нотификационен имейл.
 */
export async function addSeller(data: any) {
  // Дефинираме схема за валидация на данните
  const sellerSchema = z.object({
    email: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = sellerSchema.parse(data);
    // Нормализираме имейла (примерно до lower-case и без излишни интервали)
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    const token = cookies().get("token")?.value;
    const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    // Извличаме данни за текущото събитие
    const currentEventDb = await db
      .select({
        eventName: events.eventName,
        userUuid: events.userUuid,
      })
      .from(events)
      .where(eq(events.uuid, validatedData.eventUuid))
      .execute();
    const currentEvent = currentEventDb[0];

    if (!currentEvent) {
      return { success: false, message: 'Такова събитие не съществува!' };
    }

    // Данни за текущия (логнат) потребител
    const currentUserDb = await db
      .select({
        firstname: users.firstname,
        lastname: users.lastname,
        email: users.email,
      })
      .from(users)
      .where(eq(users.uuid, userUuid))
      .execute();
    const currentUser = currentUserDb[0];

    if (!currentUser) {
      return { success: false, message: 'Потребителят не е намерен!' };
    }

    // Проверка: не можем да добавим себе си като продавач
    if (normalizedEmail === currentUser.email.trim().toLowerCase()) {
      return { success: false, message: 'Не можете да добавите себе си като продавач!' };
    }

    // Проверка: дали текущият потребител е създател на събитието
    if (currentEvent.userUuid !== userUuid) {
      return { success: false, message: 'Не сте създател на това събитие!' };
    }

    // Проверка: дали продавачът вече е добавен
    const existingSellerDb = await db
      .select({ sellerEmail: sellers.sellerEmail })
      .from(sellers)
      .where(
        and(
          eq(sellers.sellerEmail, normalizedEmail),
          eq(sellers.eventUuid, validatedData.eventUuid)
        )
      )
      .execute();

    if (existingSellerDb.length > 0) {
      return { success: false, message: 'Този продавач вече е добавен за това събитие!' };
    }

    // Вмъкваме новия продавач в таблицата `sellers`
    await db.insert(sellers).values({
      sellerEmail: normalizedEmail,
      eventUuid: validatedData.eventUuid,
    }).execute();

    // Изпращаме уведомителен имейл
    let transporter = nodemailer.createTransport({
      //@ts-ignore
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });

    let info = await transporter.sendMail({
      from: `"${currentUser.firstname} ${currentUser.lastname}(via Eventify)" <${process.env.EMAIL_FROM}>`,
      to: normalizedEmail,
      subject: `Вие сте добавен като продавач на събитие в Eventify.bg`,
      html: `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вие сте добавен като продавач</title>
</head>
<body>
  <h1>Вие сте добавен като продавач на събитие в Eventify.bg</h1>
  <p>Здравейте!</p>
  <p>Този имейл е да ви уведоми, че сте добавен като продавач на събитието <strong>${currentEvent.eventName}</strong>.</p>
  <p>За да започнете да продавате билети, моля влезте в профила си или направете регистрация на 
     <a href="https://organize.eventify.bg">https://organize.eventify.bg</a> с този имейл адрес (${normalizedEmail}).</p>
</body>
</html>`,
    });

    console.log("Message sent to %s: %s", normalizedEmail, info.messageId);
    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при добавяне на продавач!' };
  }
}

/**
 * Извлича всички продавачи за дадено събитие + брой/сума продадени билети.
 * - Ако е фашинг, използва `faschingRequests` и `faschingTickets`.
 * - Иначе използва `eventCustomers`.
 */
export async function getSellers(data: any) {
  const eventSellerSchema = z.object({
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = eventSellerSchema.parse(data);
    const token = cookies().get("token")?.value;
    const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    const { eventUuid } = validatedData;

    // Извличаме продавачите (имейлите) за това събитие
    const sellersDb = await db
      .select({
        sellerEmail: sellers.sellerEmail,
      })
      .from(sellers)
      .where(eq(sellers.eventUuid, eventUuid))
      .execute();

    if (sellersDb.length === 0) {
      return { success: true, sellers: [] };
    }

    // Проверяваме дали е фашинг
    const isFasching = eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d";

    // Ако е фашинг, логиката е да намерим съответния user (по имейл),
    // след което по user.uuid -> да извлечем всички faschingRequests, където sellerId = user.uuid,
    // и да сумираме всички билети от faschingTickets.
    if (isFasching) {
      // За всеки продавач намираме userUuid по имейл
      const sellersResult = await Promise.all(
        sellersDb.map(async (sellerObj) => {
          const normalizedEmail = sellerObj.sellerEmail.trim().toLowerCase();

          // Търсим user по този имейл
          const userDb = await db
            .select({
              uuid: users.uuid,
              firstname: users.firstname,
              lastname: users.lastname,
            })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .execute();
          const userInfo = userDb[0];

          // Ако няма такъв потребител, маркираме го като unregistered
          if (!userInfo) {
            return {
              sellerEmail: sellerObj.sellerEmail,
              unregistered: true,
              firstname: null,
              lastname: null,
              ticketsSold: 0,
              priceOwed: 0,
              reservations: 0,
              tombolaTickets: 0,
            };
          }

          // Има потребител => намираме всички заявки, където sellerId = userInfo.uuid
          const requestsDb = await db
            .select()
            .from(faschingRequests)
            .where(eq(faschingRequests.sellerId, userInfo.uuid))
            .execute();

          let totalTicketsSold = 0;
          let totalRevenue = 0;

          // За всяка заявка взимаме всички билети от faschingTickets
          for (const req of requestsDb) {
            const ticketsDb = await db
              .select()
              .from(faschingTickets)
              .where(eq(faschingTickets.requestId, req.id))
              .execute();

            for (const t of ticketsDb) {
              totalTicketsSold += 1;
              if (t.ticketType === "fasching") {
                totalRevenue += 10;
              } else if (t.ticketType === "fasching-after") {
                totalRevenue += 25;
              }
            }
          }

          return {
            sellerEmail: sellerObj.sellerEmail,
            firstname: userInfo.firstname,
            lastname: userInfo.lastname,
            ticketsSold: totalTicketsSold,
            priceOwed: totalRevenue,
            reservations: 0,       // При фашинг не броим reservations
            tombolaTickets: 0,     // При фашинг не броим tombolaTickets
            unregistered: false,
          };
        })
      );

      return { success: true, sellers: sellersResult };
    }

    // Ако не е фашинг, продължаваме със стандартната логика
    // 1) Взимаме информация от events за цените (price, tombolaPrice)
    const eventInfoDb = await db
      .select({
        eventName: events.eventName,
        userUuid: events.userUuid,
        price: events.price,
        tombolaPrice: events.tombolaPrice,
      })
      .from(events)
      .where(eq(events.uuid, eventUuid))
      .execute();
    const eventInfo = eventInfoDb[0];

    if (!eventInfo) {
      return { success: false, message: 'Event not found' };
    }

    const eventPrice = eventInfo.price ? parseFloat(eventInfo.price) : 0;
    const tombolaPrice = eventInfo.tombolaPrice ? parseFloat(eventInfo.tombolaPrice) : 0;

    // 2) За всеки продавач намираме user по имейл и после събираме билети от eventCustomers
    const sellersResult = await Promise.all(
      sellersDb.map(async (sellerObj) => {
        const normalizedEmail = sellerObj.sellerEmail.trim().toLowerCase();

        // Намираме user
        const userDb = await db
          .select({
            uuid: users.uuid,
            firstname: users.firstname,
            lastname: users.lastname,
          })
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .execute();
        const userInfo = userDb[0];

        // Ако такъв потребител няма, връщаме unregistered
        if (!userInfo) {
          return {
            sellerEmail: sellerObj.sellerEmail,
            unregistered: true,
            firstname: null,
            lastname: null,
            ticketsSold: 0,
            priceOwed: 0,
            reservations: 0,
            tombolaTickets: 0,
          };
        }

        // Ако има потребител, броим продадените билети (reservation=false)
        const ticketsSoldDb = await db
          .select()
          .from(eventCustomers)
          .where(
            and(
              eq(eventCustomers.sellerUuid, userInfo.uuid),
              eq(eventCustomers.eventUuid, eventUuid),
              eq(eventCustomers.reservation, false)
            )
          )
          .execute();

        // Броим резервациите (reservation=true)
        const reservationsDb = await db
          .select()
          .from(eventCustomers)
          .where(
            and(
              eq(eventCustomers.sellerUuid, userInfo.uuid),
              eq(eventCustomers.eventUuid, eventUuid),
              eq(eventCustomers.reservation, true)
            )
          )
          .execute();

        // Търсим tombolaTickets (tombola_weight > 0) с tombola_seller_uuid = user.uuid
        const tombolaTicketsDb = await db
          .select({
            tombola_weight: eventCustomers.tombola_weight,
          })
          .from(eventCustomers)
          .where(
            and(
              eq(eventCustomers.tombola_seller_uuid, userInfo.uuid),
              eq(eventCustomers.eventUuid, eventUuid),
              gt(eventCustomers.tombola_weight, 0)
            )
          )
          .execute();

        const ticketsSold = ticketsSoldDb.length;
        const reservations = reservationsDb.length;
        const tombolaWeightSum = tombolaTicketsDb.reduce((acc, row) => {
          const w = row.tombola_weight ? parseFloat(row.tombola_weight) : 0;
          return acc + w;
        }, 0);

        const priceOwed = ticketsSold * eventPrice + tombolaWeightSum * tombolaPrice;

        return {
          sellerEmail: sellerObj.sellerEmail,
          firstname: userInfo.firstname,
          lastname: userInfo.lastname,
          ticketsSold,
          priceOwed,
          reservations,
          tombolaTickets: tombolaWeightSum,
          unregistered: false,
        };
      })
    );

    return { success: true, sellers: sellersResult };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при извличане на продавачите!' };
  }
}

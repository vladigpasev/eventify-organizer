"use server";
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
} from '@/schema/schema';
import { eq, and, gt } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
//@ts-ignore
import nodemailer from 'nodemailer';
import { cookies } from 'next/headers';

const db = drizzle(sql);

/**
 * Добавя нов продавач за дадено събитие.
 * (Няма промени, освен ако искате да добавите нещо специално.)
 */
export async function addSeller(data: any) {
  const sellerSchema = z.object({
    email: z.string().nonempty(),
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = sellerSchema.parse(data);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    const token = cookies().get("token")?.value;
    const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    // Проверка дали събитието съществува
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

    // Не можем да добавим себе си като продавач
    if (normalizedEmail === currentUser.email.trim().toLowerCase()) {
      return { success: false, message: 'Не можете да добавите себе си като продавач!' };
    }

    // Само създателят на събитието може да добавя продавачи
    if (currentEvent.userUuid !== userUuid) {
      return { success: false, message: 'Не сте създател на това събитие!' };
    }

    // Проверка дали вече е добавен
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

    // Вмъкваме
    await db.insert(sellers).values({
      sellerEmail: normalizedEmail,
      eventUuid: validatedData.eventUuid,
    }).execute();

    // Изпращаме уведомителен имейл
    let transporter = nodemailer.createTransport({
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
 * Връща списък от продавачи за дадено събитие + колко билети/сума имат.
 * Ако е фашинг, разделяме приходите при ъпгрейд на билет (fasching -> fasching-after).
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

    // Взимаме sellerEmail от таблицата sellers
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
    const isFasching = (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

    if (isFasching) {
      // За всеки имейл -> намираме user => (uuid, firstname, lastname)
      // после търсим заявки (faschingRequests) където sellerId = user.uuid
      // ... но трябва и да отчетем upgraderSellerId (15 лв) при fasching-after.

      const results = await Promise.all(
        sellersDb.map(async (sellerObj) => {
          const emailNormalized = sellerObj.sellerEmail.toLowerCase().trim();

          // Намираме user
          const userDb = await db
            .select({
              uuid: users.uuid,
              firstname: users.firstname,
              lastname: users.lastname,
            })
            .from(users)
            .where(eq(users.email, emailNormalized))
            .execute();

          const userInfo = userDb[0];
          if (!userInfo) {
            // unregistered
            return {
              sellerEmail: emailNormalized,
              firstname: null,
              lastname: null,
              unregistered: true,
              ticketsSold: 0,
              priceOwed: 0,
              reservations: 0,
              tombolaTickets: 0,
            };
          }

          // 1) Всички платени заявки, където sellerId = userInfo.uuid
          //    => това са поръчките, които той е продал като "основен" продавач
          const requestsDb = await db
            .select()
            .from(faschingRequests)
            .where(
              and(
                eq(faschingRequests.sellerId, userInfo.uuid),
                eq(faschingRequests.deleted, false),
                eq(faschingRequests.paid, true)
              )
            )
            .execute();

          let sumTickets = 0;
          let sumRevenue = 0;

          // При всяка заявка търсим билетите
          for (const req of requestsDb) {
            const ticketsDb = await db
              .select()
              .from(faschingTickets)
              .where(eq(faschingTickets.requestId, req.id))
              .execute();

            for (const t of ticketsDb) {
              if (t.ticketType === "fasching") {
                // Напълно "fasching" => 10 лв
                sumTickets++;
                sumRevenue += 10;
              } else if (t.ticketType === "fasching-after") {
                sumTickets++;
                if (t.upgraderSellerId) {
                  // Ако има upgraderSellerId => оригиналният продавач получава само 10
                  sumRevenue += 10;
                } else {
                  // Ако няма upgrader => значи отначало е бил купен като "fasching-after" => 25
                  sumRevenue += 25;
                }
              }
            }
          }

          // 2) Сега намираме всички билети, където upgraderSellerId = user.uuid (той е ъпгрейднал)
          //    => +15 лв за всеки такъв
          const upgradedTicketsDb = await db
            .select()
            .from(faschingTickets)
            .where(
              and(
                eq(faschingTickets.upgraderSellerId, userInfo.uuid),
                eq(faschingTickets.ticketType, "fasching-after")
              )
            )
            .execute();

          let upgradeCount = 0;
          for (const t of upgradedTicketsDb) {
            upgradeCount++;
            // ъпгрейдърът взима 15
            sumRevenue += 15;
          }

          // Сборът ticketsSold = общия брой (sumTickets) + още (ако искате) upgradeCount 
          // Но реално "собственикът" на upgrade е само ъпгрейда => 
          // Ако предпочитате да ги броите отделно, можете. 
          // Тук казваме, че ticketsSold ще брои само "цели" билети, 
          // a upgradeCount са "partial" ъпгрейди. 
          // Ако искате, можете да решите как да го показвате.
          const finalTicketsSold = sumTickets; // + upgradeCount => по желание

          return {
            sellerEmail: emailNormalized,
            firstname: userInfo.firstname,
            lastname: userInfo.lastname,
            unregistered: false,
            ticketsSold: finalTicketsSold,
            priceOwed: sumRevenue,
            reservations: 0,   // При фашинг не броим rez
            tombolaTickets: 0, // Няма tombola
          };
        })
      );

      return { success: true, sellers: results };
    }

    // ************ НЕ-ФАШИНГ ЛОГИКА ************
    // (Оставяме както е било. Само припомняме, че тук се взима eventCustomers.)

    // 1) Взимаме event info
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
      return { success: false, message: "Event not found" };
    }

    const basePrice = eventInfo.price ? parseFloat(eventInfo.price) : 0;
    const tombolaPrice = eventInfo.tombolaPrice ? parseFloat(eventInfo.tombolaPrice) : 0;

    const results = await Promise.all(
      sellersDb.map(async (sellerObj) => {
        const emailNormalized = sellerObj.sellerEmail.toLowerCase().trim();
        const userDb = await db
          .select({
            uuid: users.uuid,
            firstname: users.firstname,
            lastname: users.lastname,
          })
          .from(users)
          .where(eq(users.email, emailNormalized))
          .execute();

        const userInfo = userDb[0];
        if (!userInfo) {
          return {
            sellerEmail: sellerObj.sellerEmail,
            firstname: null,
            lastname: null,
            unregistered: true,
            ticketsSold: 0,
            priceOwed: 0,
            reservations: 0,
            tombolaTickets: 0,
          };
        }

        // броим платените (reservation=false)
        const paidDb = await db
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

        // броим резервации (reservation=true)
        const reservationDb = await db
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

        const ticketsSold = paidDb.length; // просто брой
        const reservations = reservationDb.length;

        // Tombola tickets
        const tombolaDb = await db
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

        let tombolaSum = 0;
        for (const row of tombolaDb) {
          if (row.tombola_weight) {
            tombolaSum += parseFloat(row.tombola_weight.toString());
          }
        }

        const priceOwed = ticketsSold * basePrice + tombolaSum * tombolaPrice;

        return {
          sellerEmail: emailNormalized,
          firstname: userInfo.firstname,
          lastname: userInfo.lastname,
          unregistered: false,
          ticketsSold,
          priceOwed,
          reservations,
          tombolaTickets: tombolaSum,
        };
      })
    );

    return { success: true, sellers: results };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при извличане на продавачите!' };
  }
}
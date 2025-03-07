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
import { cookies } from 'next/headers';
//@ts-ignore
import jwt from 'jsonwebtoken';
//@ts-ignore
import nodemailer from 'nodemailer';

const db = drizzle(sql);

/**
 * Добавя нов продавач.
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

    // Проверка събитие
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

    // Данни за текущия user
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

    // Само създателя на събитието може да добавя продавачи
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

    // Изпращаме имейл (опционално)
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

    await transporter.sendMail({
      from: `"${currentUser.firstname} ${currentUser.lastname}(via Eventify)" <${process.env.EMAIL_FROM}>`,
      to: normalizedEmail,
      subject: `Вие сте добавен като продавач на събитие в Eventify.bg`,
      html: `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body>
  <h1>Вие сте добавен като продавач на събитие в Eventify.bg</h1>
  <p>Здравейте!</p>
  <p>Този имейл е да ви уведоми, че сте добавен като продавач на събитието <strong>${currentEvent.eventName}</strong>.</p>
  <p>За да продавате билети, моля влезте или се регистрирайте на 
     <a href="https://organize.eventify.bg">organize.eventify.bg</a> с имейл: ${normalizedEmail}.</p>
</body>
</html>`,
    });

    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при добавяне на продавач!' };
  }
}


/**
 * Връща списък от продавачи за дадено събитие.
 * При Fasching -> подробна разбивка + separeRevenue
 * При стандартно -> ticketsSold, reservations, tombolaTickets, priceOwed
 */
export async function getSellers(data: any) {
  const eventSellerSchema = z.object({
    eventUuid: z.string().nonempty(),
  });

  try {
    const validatedData = eventSellerSchema.parse(data);
    const eventUuid = validatedData.eventUuid;

    const token = cookies().get("token")?.value;
    const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    // Взимаме sellerEmail
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

    // Проверяваме дали е Fasching
    const isFasching = (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

    if (!isFasching) {
      // НЕ-Fasching => стара логика
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

          // Платени (reservation=false)
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

          const ticketsSold = paidDb.length;

          // Резервации
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
    }

    // --------- FASCHING ЛОГИКА ---------
    const results = await Promise.all(
      sellersDb.map(async (sellerObj) => {
        const emailNormalized = sellerObj.sellerEmail.toLowerCase().trim();

        // Търсим потребителя (ако е регистриран)
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
            sellerEmail: emailNormalized,
            firstname: null,
            lastname: null,
            unregistered: true,
            faschingPortionCount: 0,
            afterPortionCount: 0,
            upgradesCount: 0,
            faschingRevenue: 0,
            afterRevenue: 0,
            totalRevenue: 0,
            separeRevenue: 0,
            grandTotal: 0,
          };
        }

        // Взимаме всички FaschingRequests, където sellerId = userInfo.uuid (платени, неделнати= false)
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

        let faschingPortionCount = 0;
        let afterPortionCount = 0;

        // Обхождаме заявките, смятаме колко F/A има
        for (const req of requestsDb) {
          const ticketsDb = await db
            .select({
              ticketType: faschingTickets.ticketType,
              upgraderSellerId: faschingTickets.upgraderSellerId,
              hiddenAfter: faschingTickets.hiddenafter,
            })
            .from(faschingTickets)
            .where(eq(faschingTickets.requestId, req.id))
            .execute();

          for (const t of ticketsDb) {
            if (t.ticketType === "fasching") {
              faschingPortionCount++;
            } else if (t.ticketType === "fasching-after") {
              if (t.hiddenAfter) {
                faschingPortionCount++;
              } else {
                if (!t.upgraderSellerId) {
                  faschingPortionCount++;
                  afterPortionCount++;
                } else {
                  faschingPortionCount++;
                }
              }
            }
          }
        }

        // Ъпгрейди, където upgraderSellerId = userInfo.uuid
        const upgradedTicketsDb = await db
          .select({
            hiddenAfter: faschingTickets.hiddenafter,
          })
          .from(faschingTickets)
          .where(
            and(
              eq(faschingTickets.upgraderSellerId, userInfo.uuid),
              eq(faschingTickets.ticketType, "fasching-after")
            )
          )
          .execute();

        let upgradesCount = 0;
        for (const t of upgradedTicketsDb) {
          if (!t.hiddenAfter) {
            // Реално after portion
            upgradesCount++;
            afterPortionCount++;
          }
        }

        // Fasching = 10 лв, After = 15 лв
        const faschingRevenue = 10 * faschingPortionCount;
        const afterRevenue = 15 * afterPortionCount;
        const totalRevenue = faschingRevenue + afterRevenue;

        // Separe revenue: намираме билети, където separesellerid = userInfo.uuid
        // и сумираме owesForSepare. Сега няма да е 0, защото не го зануляваме.
        const separeTicketsDb = await db
          .select({
            owed: faschingTickets.owesforsepare,
          })
          .from(faschingTickets)
          .where(eq(faschingTickets.separesellerid, userInfo.uuid))
          .execute();

        let separeRevenue = 0;
        for (const row of separeTicketsDb) {
          if (row.owed) {
            separeRevenue += parseFloat(row.owed.toString());
          }
        }

        const grandTotal = totalRevenue + separeRevenue;

        return {
          sellerEmail: emailNormalized,
          firstname: userInfo.firstname,
          lastname: userInfo.lastname,
          unregistered: false,
          faschingPortionCount,
          afterPortionCount,
          upgradesCount,
          faschingRevenue,
          afterRevenue,
          totalRevenue,
          separeRevenue,
          grandTotal,
        };
      })
    );

    return { success: true, sellers: results };
  } catch (error) {
    console.log(error);
    return { success: false, message: 'Грешка при извличане на продавачите!' };
  }
}

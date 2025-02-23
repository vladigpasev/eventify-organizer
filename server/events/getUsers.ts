"use server";
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and, inArray, gt } from "drizzle-orm";
import { eventCustomers, events, sellers, users } from '@/schema/schema';
import { faschingRequests, faschingTickets } from '@/schema/schema';
import { cookies } from 'next/headers';
//@ts-ignore
import jwt from 'jsonwebtoken';

const db = drizzle(sql);

interface Customer {
  uuid: string;
  firstname: string;
  lastname: string;
  email: string;
  guestCount: number;
  ticketToken: string;
  isEntered: boolean;
  paperTicket: string | null;  // Тук ще сложим guestClassGroup
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerCurrent: boolean;
  reservation: boolean;
  // Ако искате да групирате, може да добавите и requestId: number; например
}

export async function getUsers(eventUuid: string): Promise<Customer[]> {
  // 1) Проверка за автентикация
  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

  // Взимаме имейла на текущия потребител
  const currentUserDb = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .execute();
  const currentUser = currentUserDb[0];
  
  // Намираме самото събитие, за да видим кой е собственик
  const currentEventDb = await db.select({
    eventName: events.eventName,
    userUuid: events.userUuid,
    description: events.description,
    thumbnailUrl: events.thumbnailUrl,
    dateTime: events.dateTime,
    location: events.location,
    price: events.price,
    isFree: events.isFree,
    visibility: events.visibility,
  })
  .from(events)
  .where(eq(events.uuid, eventUuid))
  .execute();

  if (currentEventDb.length === 0) {
    throw new Error("Event not found");
  }
  const currentEvent = currentEventDb[0];

  // Списък с имейли на продавачи
  const sellersEmailsDb = await db.select({
    sellerEmail: sellers.sellerEmail,
  })
  .from(sellers)
  .where(eq(sellers.eventUuid, eventUuid))
  .execute();

  const sellerEmails = sellersEmailsDb.map(seller => seller.sellerEmail);

  // Проверка за достъп (ако не е собственик и не е продавач -> грешка)
  if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
    throw "Unauthorized";
  }

  // 2) Ако е фашинг, четем данни от fasching_tickets + fasching_requests
  if (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d") {
    /**
     * - Не показваме билети, ако fasching_requests.deleted = true
     * - Ако fasching_requests.paid = false -> reservation = true
     * - firstname, lastname -> guest_first_name, guest_last_name
     * - paperTicket -> guest_class_group
     * - ticketToken -> paymentCode
     * - createdAt -> fasching_requests.created_at
     */
    const faschingTicketsDb = await db.select({
      ticketId: faschingTickets.id,
      requestId: faschingTickets.requestId,
      guestFirstName: faschingTickets.guestFirstName,
      guestLastName: faschingTickets.guestLastName,
      guestEmail: faschingTickets.guestEmail,
      guestClass: faschingTickets.guestClassGroup,
      requestPaid: faschingRequests.paid,
      requestDeleted: faschingRequests.deleted,
      paymentCode: faschingRequests.paymentCode,
      requestCreatedAt: faschingRequests.createdAt,
    })
    .from(faschingTickets)
    .innerJoin(
      faschingRequests,
      eq(faschingTickets.requestId, faschingRequests.id)
    )
    .where(eq(faschingRequests.deleted, false))  // само "deleted = false"
    .orderBy(faschingTickets.requestId)         // групиране по requestId, ако искате може втори критерий
    .execute();

    // Преобразуваме към нашия интерфейс Customer
    const formatted = faschingTicketsDb.map(row => {
      // Форматираме датата (ако искате форматиране "dd.mm.yyyy, HH:MM:SS")
      const rawDate = row.requestCreatedAt ? new Date(row.requestCreatedAt) : new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Sofia',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const formattedCreatedAt = rawDate
        .toLocaleString('en-GB', options)
        .replace(',', '');

      return {
        // Превръщаме данните във формата, който ползва вашата таблица
        uuid: String(row.ticketId),
        firstname: row.guestFirstName,
        lastname: row.guestLastName,
        email: row.guestEmail,
        guestCount: 1,               // Ако искате да ползвате броя гости, тук винаги е 1
        ticketToken: row.paymentCode, // Тук слагаме paymentCode, за да се вижда в колоната за token
        isEntered: false,           // Ако не ползвате "влизане/излизане" за фашинг, винаги false
        paperTicket: row.guestClass, // Тук ще се показва класа (guestClassGroup)
        createdAt: formattedCreatedAt,
        sellerName: null,
        sellerEmail: null,
        sellerCurrent: false,
        reservation: !row.requestPaid, // Ако не е платено, => reservation = true
        // requestId: row.requestId,   // Ако ви трябва идентификатор за групиране в UI
      } satisfies Customer;
    });

    return formatted;
  }

  // 3) Ако не е фашинг, четем данните както досега от eventCustomers
  const currentCustomerDb = await db.select({
    uuid: eventCustomers.uuid,
    firstname: eventCustomers.firstname,
    lastname: eventCustomers.lastname,
    email: eventCustomers.email,
    guestCount: eventCustomers.guestCount,
    ticketToken: eventCustomers.ticketToken,
    isEntered: eventCustomers.isEntered,
    paperTicket: eventCustomers.paperTicket,
    createdAt: eventCustomers.createdAt,
    sellerUuid: eventCustomers.sellerUuid,
    reservation: eventCustomers.reservation,
  })
  .from(eventCustomers)
  .where(and(
    eq(eventCustomers.eventUuid, eventUuid),
    eq(eventCustomers.hidden, false)
  ))
  .orderBy(eventCustomers.firstname)
  .execute();

  // Събираме sellerUuid, за да търсим техните данни
  const sellerUuids = currentCustomerDb
    .map(customer => customer.sellerUuid)
    .filter(uuid => uuid);

  let sellerMap: Record<string, { fullName: string; email: string }> = {};

  if (sellerUuids.length > 0) {
    const sellerDetailsDb = await db.select({
      uuid: users.uuid,
      firstName: users.firstname,
      lastName: users.lastname,
      email: users.email,
    })
    .from(users)
    // @ts-ignore
    .where(inArray(users.uuid, sellerUuids))
    .execute();

    sellerMap = sellerDetailsDb.reduce((acc, seller) => {
      // @ts-ignore
      acc[seller.uuid] = {
        fullName: `${seller.firstName} ${seller.lastName}`,
        email: seller.email,
      };
      return acc;
    }, {} as Record<string, { fullName: string; email: string }>);
  }

  // Форматираме датите
  const formattedCustomers = currentCustomerDb.map(customer => {
    // @ts-ignore
    const createdAtDate = new Date(customer.createdAt);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Sofia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formattedCreatedAt = createdAtDate
      .toLocaleString('en-GB', options)
      .replace(',', '');

    const sellerData = customer.sellerUuid
      ? sellerMap[customer.sellerUuid] || { fullName: null, email: null }
      : { fullName: null, email: null };

    return {
      uuid: customer.uuid || '',
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      guestCount: Number(customer.guestCount),
      ticketToken: customer.ticketToken || '',
      isEntered: customer.isEntered ?? false,
      paperTicket: customer.paperTicket,
      createdAt: formattedCreatedAt,
      sellerName: sellerData.fullName,
      sellerEmail: sellerData.email,
      sellerCurrent: customer.sellerUuid === userUuid,
      reservation: customer.reservation ?? false,
    } satisfies Customer;
  });

  return formattedCustomers;
}
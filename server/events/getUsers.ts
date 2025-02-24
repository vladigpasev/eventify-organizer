"use server";
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and, inArray, or, gt } from "drizzle-orm";
import {
  eventCustomers,
  events,
  sellers,
  users,
  faschingRequests,
  faschingTickets
} from '@/schema/schema';
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
  paperTicket: string | null;
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerCurrent: boolean;
  reservation: boolean;
  ticketCode?: string;
  ticket_type?: string;
  // Новите полета (за Фашинг)
  guestSchoolName?: string | null;
  guestExternalGrade?: string | null;
  expiresSoon?: boolean;

  // ➜ Добавяме за Фашинг:
  isEnteredFasching?: boolean; 
  isEnteredAfter?: boolean;
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
     * - Неплатените поръчки, които са създадени преди повече от 3 дни, се пропускат (изтекли).
     * - Ако им остава < 24 часа (>= 48 часа минали), да има флаг expiresSoon = true.
     * - Взимаме и полетата entered_fasching, entered_after.
     */
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const faschingTicketsDb = await db.select({
      ticketId: faschingTickets.id,
      requestId: faschingTickets.requestId,
      guestFirstName: faschingTickets.guestFirstName,
      guestLastName: faschingTickets.guestLastName,
      guestEmail: faschingTickets.guestEmail,
      guestClass: faschingTickets.guestClassGroup,
      guestSchoolName: faschingTickets.guestSchoolName,
      guestExternalGrade: faschingTickets.guestExternalGrade,

      requestPaid: faschingRequests.paid,
      requestDeleted: faschingRequests.deleted,
      paymentCode: faschingRequests.paymentCode,
      requestCreatedAt: faschingRequests.createdAt,
      ticketCode: faschingTickets.ticketCode,
      ticket_type: faschingTickets.ticketType,

      // ➜ добавяме
      enteredFasching: faschingTickets.entered_fasching,
      enteredAfter: faschingTickets.entered_after,
    })
    .from(faschingTickets)
    .innerJoin(
      faschingRequests,
      eq(faschingTickets.requestId, faschingRequests.id)
    )
    .where(
      and(
        eq(faschingRequests.deleted, false),
        // Ако е платено -> винаги го показваме
        // Ако не е платено -> показваме го само ако createdAt > три дни назад
        or(
          eq(faschingRequests.paid, true),
          gt(faschingRequests.createdAt, threeDaysAgo)
        )
      )
    )
    .orderBy(faschingTickets.requestId)
    .execute();

    // Преобразуваме към нашия интерфейс Customer
    const formatted = faschingTicketsDb.map(row => {
      const rawDate = row.requestCreatedAt ? new Date(row.requestCreatedAt) : new Date();
      // Изчисляваме колко дни са минали
      const diffMs = now.getTime() - rawDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Ако не е платено и са минали над 48 часа, остава < 24
      const expiresSoon = !row.requestPaid && diffDays > 2;

      // Форматираме датата (dd/mm/yyyy hh:mm:ss)
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
        uuid: String(row.ticketId),
        firstname: row.guestFirstName,
        lastname: row.guestLastName,
        email: row.guestEmail,
        guestCount: 1,
        ticketToken: row.paymentCode,
        // При Фашинг в оригиналния код беше set-нато винаги false
        // Сега ще го оставим false, защото isEntered не ни трябва
        // (ползваме isEnteredFasching / isEnteredAfter).
        isEntered: false,

        // Поле за "клас" -> слагаме го в paperTicket
        paperTicket: row.guestClass,
        createdAt: formattedCreatedAt,
        sellerName: null,
        sellerEmail: null,
        sellerCurrent: false,

        // Показва дали е платен или не
        // reservation = !paid => ако не е платено => true
        reservation: !row.requestPaid,

        ticketCode: row.ticketCode,
        ticket_type: row.ticket_type,

        guestSchoolName: row.guestSchoolName,
        guestExternalGrade: row.guestExternalGrade,
        expiresSoon,

        // ➜ новите пропъртита
        isEnteredFasching: row.enteredFasching,
        isEnteredAfter: row.enteredAfter,
      } satisfies Customer;
    });

    return formatted;
  }

  // 3) Ако не е фашинг
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

  const now = new Date();

  // Форматираме датите
  const formattedCustomers = currentCustomerDb.map(customer => {
    const createdAtDate = customer.createdAt ? new Date(customer.createdAt) : new Date();
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

    // За non-Fasching не ползваме guestSchoolName/guestExternalGrade
    const sellerData = customer.sellerUuid
      ? sellerMap[customer.sellerUuid] || { fullName: '', email: '' }
      : { fullName: '', email: '' };

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
      sellerName: sellerData.fullName || null,
      sellerEmail: sellerData.email || null,
      sellerCurrent: customer.sellerUuid === userUuid,
      reservation: customer.reservation ?? false,

      // Ненужни за non-Fasching
      ticketCode: undefined,
      ticket_type: undefined,
      guestSchoolName: null,
      guestExternalGrade: null,
      expiresSoon: false,

      // само за fasching
      isEnteredFasching: undefined,
      isEnteredAfter: undefined,
    } satisfies Customer;
  });

  return formattedCustomers;
}

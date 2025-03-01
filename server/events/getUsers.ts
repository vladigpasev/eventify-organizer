"use server";

import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { eq, and, inArray, or, gt } from "drizzle-orm";
import {
  eventCustomers,
  events,
  sellers,
  users,
  faschingRequests,
  faschingTickets,
} from "@/schema/schema";
import { cookies } from "next/headers";
//@ts-ignore
import jwt from "jsonwebtoken";

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
  // Fasching fields
  guestSchoolName?: string | null;
  guestExternalGrade?: string | null;
  expiresSoon?: boolean;
  isEnteredFasching?: boolean;
  isEnteredAfter?: boolean;
  votedAt?: string | null;
}

export async function getUsers(eventUuid: string): Promise<Customer[]> {
  // 1) Auth
  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

  const currentUserDb = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .execute();
  const currentUser = currentUserDb[0];

  // find event
  const currentEventDb = await db
    .select({
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

  // find sellers
  const sellersEmailsDb = await db
    .select({ sellerEmail: sellers.sellerEmail })
    .from(sellers)
    .where(eq(sellers.eventUuid, eventUuid))
    .execute();
  const sellerEmails = sellersEmailsDb.map((s) => s.sellerEmail);

  // check access
  if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
    throw "Unauthorized";
  }

  // 2) If Fasching
  if (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d") {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const faschingTicketsDb = await db
      .select({
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

        enteredFasching: faschingTickets.entered_fasching,
        enteredAfter: faschingTickets.entered_after,
        votedAt: faschingTickets.votedAt,
      })
      .from(faschingTickets)
      .innerJoin(faschingRequests, eq(faschingTickets.requestId, faschingRequests.id))
      .where(
        and(
          eq(faschingRequests.deleted, false),
          or(eq(faschingRequests.paid, true), gt(faschingRequests.createdAt, threeDaysAgo))
        )
      )
      .orderBy(faschingTickets.requestId)
      .execute();

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Europe/Sofia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    const data = faschingTicketsDb.map((row) => {
      const createdRaw = row.requestCreatedAt
        ? new Date(row.requestCreatedAt)
        : new Date();
      const diffMs = now.getTime() - createdRaw.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const expiresSoon = !row.requestPaid && diffDays > 2;

      const formattedCreatedAt = createdRaw
        .toLocaleString("en-GB", options)
        .replace(",", "");

      const votedAtFormatted = row.votedAt
        ? new Date(row.votedAt).toLocaleString("en-GB", options).replace(",", "")
        : null;

      return {
        uuid: String(row.ticketId),
        firstname: row.guestFirstName,
        lastname: row.guestLastName,
        email: row.guestEmail,
        guestCount: 1,
        ticketToken: row.paymentCode,
        isEntered: false,
        paperTicket: row.guestClass,
        createdAt: formattedCreatedAt,
        sellerName: null,
        sellerEmail: null,
        sellerCurrent: false,
        reservation: !row.requestPaid,
        ticketCode: row.ticketCode,
        ticket_type: row.ticket_type,
        guestSchoolName: row.guestSchoolName,
        guestExternalGrade: row.guestExternalGrade,
        expiresSoon,
        isEnteredFasching: row.enteredFasching,
        isEnteredAfter: row.enteredAfter,
        votedAt: votedAtFormatted,
      } satisfies Customer;
    });

    return data;
  }

  // 3) Not Fasching
  const currentCustomerDb = await db
    .select({
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
    .where(and(eq(eventCustomers.eventUuid, eventUuid), eq(eventCustomers.hidden, false)))
    .orderBy(eventCustomers.firstname)
    .execute();

  // build map for sellers
  const sellerUuids = currentCustomerDb.map((c) => c.sellerUuid).filter((u) => u);
  let sellerMap: Record<string, { fullName: string; email: string }> = {};

  if (sellerUuids.length > 0) {
    const sellerDetailsDb = await db
      .select({
        uuid: users.uuid,
        firstName: users.firstname,
        lastName: users.lastname,
        email: users.email,
      })
      .from(users)
      // @ts-ignore
      .where(inArray(users.uuid, sellerUuids))
      .execute();

    sellerMap = sellerDetailsDb.reduce((acc, s) => {
      // @ts-ignore
      acc[s.uuid] = {
        fullName: `${s.firstName} ${s.lastName}`,
        email: s.email,
      };
      return acc;
    }, {} as Record<string, { fullName: string; email: string }>);
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const data = currentCustomerDb.map((c) => {
    const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
    const formattedCreatedAt = createdDate.toLocaleString("en-GB", options).replace(",", "");
    const sellerData = c.sellerUuid ? sellerMap[c.sellerUuid] : null;

    return {
      uuid: c.uuid || "",
      firstname: c.firstname,
      lastname: c.lastname,
      email: c.email,
      guestCount: Number(c.guestCount),
      ticketToken: c.ticketToken || "",
      isEntered: c.isEntered ?? false,
      paperTicket: c.paperTicket,
      createdAt: formattedCreatedAt,
      sellerName: sellerData?.fullName || null,
      sellerEmail: sellerData?.email || null,
      sellerCurrent: c.sellerUuid === userUuid,
      reservation: c.reservation ?? false,
      // Not used:
      ticketCode: undefined,
      ticket_type: undefined,
      guestSchoolName: null,
      guestExternalGrade: null,
      expiresSoon: false,
      isEnteredFasching: undefined,
      isEnteredAfter: undefined,
      votedAt: null,
    } satisfies Customer;
  });

  return data;
}

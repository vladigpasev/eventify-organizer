"use server";
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and, inArray } from "drizzle-orm";
import { eventCustomers, events, sellers, users } from '@/schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const db = drizzle(sql);

interface Customer {
  uuid: string;
  firstname: string;
  lastname: string;
  email: string;
  guestCount: number;
  ticketToken: string;
  isEntered: boolean;
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerCurrent: boolean;
  reservation: boolean;
}

export async function getUsers(eventUuid: string): Promise<Customer[]> {
  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

  const currentUserDb = await db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .execute();
  const currentUser = currentUserDb[0];

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
  const currentEvent = currentEventDb[0];

  const sellersEmailsDb = await db.select({
    sellerEmail: sellers.sellerEmail,
  })
    .from(sellers)
    .where(eq(sellers.eventUuid, eventUuid))
    .execute();

  const sellerEmails = sellersEmailsDb.map(seller => seller.sellerEmail);

  if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
    throw "Unauthorized";
  }

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

  // Fetch seller details for each customer
  const sellerUuids = currentCustomerDb.map(customer => customer.sellerUuid).filter(uuid => uuid);

  let sellerMap: Record<string, string> = {};

  if (sellerUuids.length > 0) {
    const sellerDetailsDb = await db.select({
      uuid: users.uuid,
      firstName: users.firstname,
      lastName: users.lastname,
      email: users.email,
    })
      .from(users)
      //@ts-ignore
      .where(inArray(users.uuid, sellerUuids))
      .execute();

    sellerMap = sellerDetailsDb.reduce((map, seller) => {
      //@ts-ignore
      map[seller.uuid] = `${seller.firstName} ${seller.lastName}`;
      map[seller.uuid + "_email"] = seller.email;
      return map;
    }, {} as Record<string, string>);
  }

  // Format createdAt to dd.mm.YYYY, HH:mm:ss format in Sofia's time zone
  const formattedCustomers = currentCustomerDb.map(customer => {
    //@ts-ignore
    const createdAt = new Date(customer.createdAt);
    const options = {
      timeZone: 'Europe/Sofia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    //@ts-ignore
    const formattedCreatedAt = createdAt.toLocaleString('en-GB', options).replace(',', '');

    return {
      ...customer,
      createdAt: formattedCreatedAt,
      //@ts-ignore
      sellerName: sellerMap[customer.sellerUuid] || null,
      sellerEmail: sellerMap[customer.sellerUuid + "_email"] || null,
      sellerCurrent: customer.sellerUuid === userUuid,
    };
  });
  //@ts-ignore
  return formattedCustomers;
}
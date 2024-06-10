import React from 'react';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from "drizzle-orm";
import { events, sellers, users } from '../../../../schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation';
import EventTitleEditor from '@/components/ManageEvent/EventTitle';
import EventDescriptionEditor from '@/components/ManageEvent/EventDescriptionEditor';
import EventThumbnailChanger from '@/components/ManageEvent/EventThumbnailChanger';
import EventDateTimeEditor from '@/components/ManageEvent/EventDateTimeEditor';
import LocationChanger from '@/components/ManageEvent/LocationChanger';
import EventPriceEditor from '@/components/ManageEvent/PriceEdit';
import PublicPrivateToggle from '@/components/ManageEvent/PublicPrivateToggle';
import DeleteEvent from '@/components/ManageEvent/DeleteEvent';
import UserTable from '../../../../components/ManageEvent/UsersTable';
import SellTickets from '@/components/SellTickets';

export const maxDuration = 300;

const db = drizzle(sql);

const isValidUUID = (uuid: any) => {
  const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexExp.test(uuid);
}

async function EventManagementPage({ params }: { params: { uuid: string } }) {
  if (!isValidUUID(params.uuid)) {
    notFound();
    return;
  }

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
    .where(eq(events.uuid, params.uuid))
    .execute();

  if (currentEventDb.length === 0) {
    notFound();
    return;
  }

  const currentEvent = currentEventDb[0];

  const sellersDb = await db.select({
    sellerEmail: sellers.sellerEmail,
  })
    .from(sellers)
    .where(eq(sellers.eventUuid, params.uuid))
    .execute();

  const sellerEmails = sellersDb.map(seller => seller.sellerEmail);

  let isSeller;
  if (userUuid !== currentEvent.userUuid && !sellerEmails.includes(currentUser.email)) {
    notFound();
    return;
  } else if (sellerEmails.includes(currentUser.email)) {
    isSeller = true;
  }

  return (
    <div className="container mx-auto p-4">
      <EventTitleEditor initialTitle={currentEvent.eventName} eventId={params.uuid} isSeller={isSeller} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded p-4 text-black">
          <EventDescriptionEditor initialDescription={currentEvent.description} eventId={params.uuid} isSeller={isSeller} />
          <EventThumbnailChanger initialThumbnailUrl={currentEvent.thumbnailUrl} eventId={params.uuid} isSeller={isSeller} />
          <EventDateTimeEditor initialDateTime={currentEvent.dateTime} eventId={params.uuid} isSeller={isSeller} />
          <LocationChanger initialLocation={currentEvent.location} eventId={params.uuid} isSeller={isSeller} />
          <PublicPrivateToggle initialVisibility={currentEvent.visibility} eventId={params.uuid} isSeller={isSeller} />
          <EventPriceEditor initialPrice={currentEvent.price} isFree={currentEvent.isFree} eventId={params.uuid} isSeller={isSeller} />
        </div>
        <UserTable eventId={params.uuid} isSeller={isSeller} userUuid={userUuid} />
      </div>
        <div className="bg-white shadow rounded p-4 mt-4">
          <h2 className="text-xl font-semibold mb-3">Продавачи на билети</h2>
          <div className=''>
            <SellTickets eventUuid={params.uuid} isSeller={isSeller} />
          </div>
        </div>
      {isSeller && (<></>) || <>
        <DeleteEvent eventId={params.uuid} eventName={currentEvent.eventName} />
      </>}
    </div>
  );
}

export default EventManagementPage;

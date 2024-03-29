//Copyright (C) 2024  Vladimir Pasev
import React from 'react';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and } from "drizzle-orm";
import { events } from '../../../../schema/schema';
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

  if (currentEventDb.length > 0) {
    // There are results
  } else {
    notFound();
  }

  const currentEvent = currentEventDb[0];

  if (userUuid != currentEvent.userUuid) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">

      <EventTitleEditor initialTitle={currentEvent.eventName} eventId={params.uuid} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded p-4 text-black">
          {/* Edit events fields in other client side rendered components */}
          <EventDescriptionEditor initialDescription={currentEvent.description} eventId={params.uuid} />
          <EventThumbnailChanger initialThumbnailUrl={currentEvent.thumbnailUrl} eventId={params.uuid} />
          <EventDateTimeEditor initialDateTime={currentEvent.dateTime} eventId={params.uuid} />
          <LocationChanger initialLocation={currentEvent.location} eventId={params.uuid} />
          <PublicPrivateToggle initialVisibility={currentEvent.visibility} eventId={params.uuid} />
          <EventPriceEditor initialPrice={currentEvent.price} isFree={currentEvent.isFree} eventId={params.uuid} />
          <p className='text-gray-400 mb-5'>*Editing any significat information about your event may make your customers ask for refund! They will be notified about the changes and will have the opportunity do it. All tickets will be reissued!</p>
          <p className='text-gray-400 mb-5'>**Any price changes will apply to new customers only!</p>
        </div>
        <UserTable eventId={params.uuid} />
      </div>
      <div className="bg-white shadow rounded p-4 mt-4">
        <h2 className="text-xl font-semibold mb-3">Advertisement Options</h2>
        <div className='flex justify-center items-center'>
          <p className='text-gray-300 font-semibold'>(COMING SOON)</p>
        </div>
      </div>
      <DeleteEvent eventId={params.uuid} eventName={currentEvent.eventName} />
    </div>
  );
};
export default EventManagementPage;
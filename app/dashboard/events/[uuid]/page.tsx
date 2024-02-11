// EventManagementPage.jsx
import React from 'react';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from 'drizzle-orm';
import { events } from '../../../../schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
import Stripe from 'stripe';
import { notFound } from 'next/navigation';
import { editTitle } from '@/server/events/edit';

const db = drizzle(sql);

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

const isValidUUID = (uuid:any) => {
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
    userUuid: events.userUuid
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

  // Here you would have your state and methods for handling changes,
  // form submissions, and other interactions.

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4"><input type="text" value={currentEvent.eventName} /></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-3">Event Details</h2>
          {/* Replace "input" with controlled components with your state */}
          <div className="mb-3">
            <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">Event Name</label>
            <input type="text" id="eventName" className="input input-bordered w-full max-w-xs" placeholder="Enter event name" />
          </div>
          {/* Add more fields for description, thumbnail, location, etc. */}
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-3">Customers</h2>
          {/* Customer list and management buttons */}
        </div>
      </div>
      <div className="bg-white shadow rounded p-4 mt-4">
        <h2 className="text-xl font-semibold mb-3">Advertisement Options</h2>
        {/* Toggle buttons or checkboxes for advertisement features */}
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button className="btn btn-primary">Save Changes</button>
        <button className="btn btn-accent">Delete Event</button>
      </div>
    </div>
  );
};
export default EventManagementPage;

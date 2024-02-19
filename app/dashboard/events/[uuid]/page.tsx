import React from "react";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { eq } from "drizzle-orm";
import { eventCustomers, events } from "../../../../schema/schema";
//@ts-ignore
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import EventTitleEditor from "@/components/ManageEvent/EventTitle";
import EventDescriptionEditor from "@/components/ManageEvent/EventDescriptionEditor";
import EventThumbnailChanger from "@/components/ManageEvent/EventThumbnailChanger";
import EventDateTimeEditor from "@/components/ManageEvent/EventDateTimeEditor";
import LocationChanger from "@/components/ManageEvent/LocationChanger";
import EventPriceEditor from "@/components/ManageEvent/PriceEdit";
import AddCustomer from "@/components/ManageEvent/AddCustomer";
import Link from "next/link";
import TicketDeactivateBtn from "@/components/ManageEvent/TicketDeactivateBtn";
import CheckTicket from "@/components/ManageEvent/CheckTickets";
import TicketActionsBtn from "@/components/ManageEvent/TicketActionsBtn";
import PublicPrivateToggle from "@/components/ManageEvent/PublicPrivateToggle";
import DeleteEvent from "@/components/ManageEvent/DeleteEvent";

const db = drizzle(sql);

const isValidUUID = (uuid: any) => {
  const regexExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexExp.test(uuid);
};

async function EventManagementPage({ params }: { params: { uuid: string } }) {
  if (!isValidUUID(params.uuid)) {
    notFound();
    return;
  }

  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

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
    .where(eq(events.uuid, params.uuid))
    .execute();

  const currentCustomerDb = await db
    .select({
      uuid: eventCustomers.uuid,
      firstname: eventCustomers.firstname,
      lastname: eventCustomers.lastname,
      email: eventCustomers.email,
      guestCount: eventCustomers.guestCount,
      ticketToken: eventCustomers.ticketToken,
    })
    .from(eventCustomers)
    .where(eq(eventCustomers.eventUuid, params.uuid))
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
      <EventTitleEditor
        initialTitle={currentEvent.eventName}
        eventId={params.uuid}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded p-4">
          {/* Edit events fields in other client side rendered components */}
          <EventDescriptionEditor
            initialDescription={currentEvent.description}
            eventId={params.uuid}
          />
          <EventThumbnailChanger
            initialThumbnailUrl={currentEvent.thumbnailUrl}
            eventId={params.uuid}
          />
          <EventDateTimeEditor
            initialDateTime={currentEvent.dateTime}
            eventId={params.uuid}
          />
          <LocationChanger
            initialLocation={currentEvent.location}
            eventId={params.uuid}
          />
          <PublicPrivateToggle
            initialVisibility={currentEvent.visibility}
            eventId={params.uuid}
          />
          <EventPriceEditor
            initialPrice={currentEvent.price}
            isFree={currentEvent.isFree}
            eventId={params.uuid}
          />
          <p className="text-gray-400 mb-5">
          *Редактирането на значителна информация за събитието може да направи
            клиентите да поискат връщане на парите! Те ще бъдат уведомени за промените.
            и ще имат възможност да го направят. Всички билети ще бъдат преиздадени!
          </p>
          <p className="text-gray-400 mb-5">
          **Всички промени в цените се отнасят само за нови клиенти!
          </p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold mb-3">Tickets</h2>
            <div className="flex gap-2 sm:flex-row flex-col">
              <AddCustomer eventId={params.uuid} />
              <CheckTicket eventId={params.uuid} />
            </div>
          </div>

          {/* Customer list and management buttons */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Име</th>
                  <th>Имехл</th>
                  <th>Гости</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {currentCustomerDb.map((customer, index) => (
                  <tr key={index}>
                    <th></th>
                    <td>
                      <div className="flex items-center ">
                        <div className="avatar"></div>
                        <div>
                          <div className="font-bold">{`${customer.firstname} ${customer.lastname}`}</div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.guestCount}</td>
                    <th>
                      <Link
                        className="btn btn-ghost btn-xs text-black"
                        href={
                          process.env.TICKETS_BASE_URL +
                          `/` +
                          customer.ticketToken
                        }
                        target="_blank"
                      >
                        <svg
                          height="24"
                          viewBox="0 0 1792 1792"
                          width="24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1024 452l316 316-572 572-316-316zm-211 979l618-618q19-19 19-45t-19-45l-362-362q-18-18-45-18t-45 18l-618 618q-19 19-19 45t19 45l362 362q18 18 45 18t45-18zm889-637l-907 908q-37 37-90.5 37t-90.5-37l-126-126q56-56 56-136t-56-136-136-56-136 56l-125-126q-37-37-37-90.5t37-90.5l907-906q37-37 90.5-37t90.5 37l125 125q-56 56-56 136t56 136 136 56 136-56l126 125q37 37 37 90.5t-37 90.5z"
                            fill="currentColor"
                          />
                        </svg>
                      </Link>
                    </th>
                    <th>
                      <TicketActionsBtn
                        ticketToken={customer.ticketToken}
                        eventId={params.uuid}
                      />
                    </th>
                    <th>
                      <TicketDeactivateBtn customerUuid={customer.uuid} />
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded p-4 mt-4">
        <h2 className="text-xl font-semibold mb-3">Опции за реклама</h2>
        <div className="flex justify-center items-center">
          <p className="text-gray-300 font-semibold">(Очаквайте скоро)</p>
        </div>
      </div>
      <DeleteEvent eventId={params.uuid} eventName={currentEvent.eventName} />
    </div>
  );
}
export default EventManagementPage;

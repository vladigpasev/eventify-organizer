import EurSign from '@/public/images/icons/EurSign';
import EventTimeSvg from '@/public/images/icons/EventTime';
import GoSvg from '@/public/images/icons/GoSvg';
import LocationSvg from '@/public/images/icons/Location';
import React from 'react';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, inArray } from 'drizzle-orm';
import { events, sellers, users } from '../schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});
const db = drizzle(sql);

async function SellerView() {
    const token = cookies().get('token')?.value;
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

    const eventsToSell = await db
        .select({
            eventUuid: sellers.eventUuid,
        })
        .from(sellers)
        .where(eq(sellers.sellerEmail, currentUser.email))
        .execute();

    const eventUuids = eventsToSell.map((event) => event.eventUuid);

    const userQueryResult = await db
        .select({
            uuid: events.uuid,
            eventName: events.eventName,
            dateTime: events.dateTime,
            location: events.location,
            isFree: events.isFree,
            price: events.price,
            thumbnailUrl: events.thumbnailUrl,
            userUuid: events.userUuid,
        })
        .from(events)
        .where(inArray(events.uuid, eventUuids))
        .execute();

    // Fetch user details for each event creator
    const userUuids = userQueryResult.map(event => event.userUuid);
    const userCreators = await db
        .select({
            uuid: users.uuid,
            firstName: users.firstname,
            lastName: users.lastname,
        })
        .from(users)
        .where(inArray(users.uuid, userUuids))
        .execute();

    // Create a map of user details for quick access
    const userMap = userCreators.reduce((map, user) => {
      //@ts-ignore
        map[user.uuid] = user;
        return map;
    }, {});

    return (
        <div className='p-5'>
            <div className='pb-5 flex flex-row justify-between items-center'>
                <h1 className='text-xl font-medium'>Продаване на билети</h1>
            </div>
            <div className='w-full flex flex-grow items-center justify-center'>
                <div
                    className={`grid ${
                        userQueryResult.length >= 3
                            ? 'md:grid-cols-4 sm:grid-cols-3'
                            : 'grid-cols-1 justify-items-center'
                    } supersmall:grid-cols-2 gap-5 w-fit`}
                >
                    {userQueryResult.length > 0 ? (
                        userQueryResult.map((event) => (
                            <div key={event.uuid} className='bg-white w-46 p-3 rounded overflow-hidden shadow-xl'>
                                <div className='pb-2 h-60'>
                                    <img
                                        src={event.thumbnailUrl}
                                        alt='Корица на събитието'
                                        className='w-full h-full object-cover object-center rounded'
                                    />
                                </div>
                                <div className='flex flex-col flex-grow'>
                                    <div className='text-black text-base font-normal'>{event.eventName}</div>
                                    <div className='flex items-center gap-1'>
                                        <EventTimeSvg />
                                        <div className='text-stone-500 text-[10.36px] font-medium'>
                                            {new Date(event.dateTime).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <LocationSvg />
                                        <div className='text-stone-500 text-[10.36px] font-medium'>{event.location}</div>
                                    </div>
                                    <div className='text-stone-500 text-[10.36px] font-medium'>
                                      {/* @ts-ignore */}
                                        Създател: {userMap[event.userUuid].firstName} {userMap[event.userUuid].lastName}
                                    </div>
                                    <div className='flex flex-row justify-between'>
                                        <div className='flex items-center gap-1'>
                                            <EurSign />
                                            <div className='text-black text-xs font-medium leading-tight'>
                                                {event.isFree ? 'Безплатно' : `От ${event.price} лв.`}
                                            </div>
                                        </div>
                                        <a href={`/dashboard/events/${event.uuid}`}>
                                            <div className='cursor-pointer text-blue-800 hover:opacity-80'>
                                                <GoSvg />
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div>Няма събития за показване</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SellerView;

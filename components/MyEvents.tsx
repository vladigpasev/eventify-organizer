import EurSign from '@/public/images/icons/EurSign'
import EventTimeSvg from '@/public/images/icons/EventTime'
import GoSvg from '@/public/images/icons/GoSvg'
import LocationSvg from '@/public/images/icons/Location'
import Link from 'next/link'
import React from 'react'
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from 'drizzle-orm';
import { events } from '../schema/schema';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });
const db = drizzle(sql);

async function MyEvents() {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;

    const userQueryResult = await db.select({
        uuid: events.uuid,
        eventName: events.eventName,
        dateTime: events.dateTime,
        location: events.location,
        isFree: events.isFree,
        price: events.price,
        thumbnailUrl: events.thumbnailUrl,
    })
        .from(events)
        .where(eq(events.userUuid, userUuid))
        .execute();

        

    return (
        <div className='p-5'>
            <div className='pb-5 flex flex-row justify-between items-center'>
                <h1 className='text-xl font-medium'>My Events</h1>
                <a href="/dashboard/create">
                    <div
                        className="w-[47px] h-[46px] px-3.5 py-2.5 bg-white rounded-xl border border-blue-800 justify-center items-center gap-2.5 inline-flex cursor-pointer"
                    >
                        <div className="text-blue-800 text-base font-medium font-['Poppins'] leading-relaxed">+</div>
                    </div>
                </a>
            </div>
            <div className='w-full flex flex-grow items-center justify-center'>
                <div className={`grid ${userQueryResult.length >= 3 ? 'md:grid-cols-4 sm:grid-cols-3' : 'grid-cols-1 justify-items-center'} supersmall:grid-cols-2 gap-5 w-fit`}>
                    {userQueryResult.length > 0 ? userQueryResult.map(event => (
                        <div key={event.uuid} className='bg-white w-46 p-3 rounded overflow-hidden shadow-xl'>
                            <div className='pb-2 h-60'>
                                {/* Replace with dynamic image source */}
                                <img src={event.thumbnailUrl} alt="Event Image" className='w-full h-full object-cover object-center rounded' />
                            </div>
                            <div className='flex flex-col flex-grow'>
                                <div className="text-black text-base font-normal">{event.eventName}</div>
                                <div className='flex items-center gap-1'><EventTimeSvg /><div className="text-stone-500 text-[10.36px] font-medium">{new Date(event.dateTime).toLocaleString()}</div></div>
                                <div className='flex items-center gap-1'><LocationSvg /><div className="text-stone-500 text-[10.36px] font-medium">{event.location}</div></div>
                                <div className='flex flex-row justify-between'>
                                    <div className='flex items-center gap-1'> 
                                        <EurSign />
                                        <div className="text-black text-xs font-medium leading-tight">{event.isFree ? 'Free' : `From ${event.price} BGN`}</div>
                                    </div>
                                    <Link href={`/dashboard/events/${event.uuid}`}><div className='cursor-pointer text-blue-800 hover:opacity-80'><GoSvg /></div></Link>
                                </div>
                            </div>
                        </div>
                    )) : <div>No events to display</div>}
                </div>
            </div>
        </div>
    )
}

export default MyEvents;

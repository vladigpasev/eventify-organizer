//Copyright (C) 2024  Vladimir Pasev
import MyEvents from '@/components/MyEvents'
import { cookies } from 'next/headers';
import React from 'react'
//@ts-ignore
import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { sellers, users } from '@/schema/schema';
import { eq, is } from 'drizzle-orm';
import SellerView from '@/components/SellerView';

const db = drizzle(sql);

async function Dashboard() {

  const token = cookies().get("token")?.value;
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userUuid = decodedToken.uuid;

  const currentUserDb = await db.select({
    firstname: users.firstname,
    lastname: users.lastname,
    email: users.email,
  })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .execute();
  const currentUser = currentUserDb[0];

  const sellersDb = await db.select()
    .from(sellers)
    .where(eq(sellers.sellerEmail, currentUser.email))
    .execute();
  let isSellerInEvents = false;
  if (sellersDb.length > 0) {
    isSellerInEvents = true;
  }
  return (
    <div>
      <MyEvents />
      {isSellerInEvents && (
        <div className="mt-8">
          <SellerView />
        </div>
      )}
    </div>
  )
}

export default Dashboard
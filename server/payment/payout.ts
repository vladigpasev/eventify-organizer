"use server"

import { cookies } from "next/headers";
//@ts-ignore
import jwt from "jsonwebtoken"
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import Stripe from 'stripe';
import { redirect } from "next/navigation";

const db = drizzle(sql);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });

export async function createPayoutLink() {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    

    const payoutId = decodedToken.payoutId;
    const payoutLink = await stripe.accountLinks.create({
        account: payoutId,
        refresh_url: `${process.env.BASE_URL}/dashboard`,
        return_url: `${process.env.BASE_URL}/dashboard`,
        type: 'account_onboarding'
      });
      redirect(payoutLink.url);
}
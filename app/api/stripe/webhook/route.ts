//Copyright (C) 2024  Vladimir Pasev
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { eq } from 'drizzle-orm';
import { users } from '@/schema/schema';

const db = drizzle(sql);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload as string, sig, endpointSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400
    });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      if (await isInvoicePaid(event.data.object.latest_invoice)) {
        const webhookData = event.data.object;
        const newStatus = determineSubscriptionStatus(webhookData);
        await updateUserSubscriptionStatus(webhookData.customer, newStatus, event.type);
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      if (invoice.subscription) {
        //@ts-ignore
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const newStatus = determineSubscriptionStatus(subscription);
        await updateUserSubscriptionStatus(subscription.customer, newStatus, 'invoice.payment_succeeded');
      }
      break;

    case 'customer.subscription.deleted':
      const webhookData = event.data.object;
      await updateUserSubscriptionStatus(webhookData.customer, 'Hobby', event.type);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new Response('Received', {
    status: 201
  });
}
//@ts-ignore
function determineSubscriptionStatus(subscription) {
  const lookupKey = subscription.items.data[0].price.lookup_key;

  switch (lookupKey) {
    case 'basic_plan_month':
    case 'basic_plan_year':
      return 'Basic';
    case 'premium_plan_month':
    case 'premium_plan_year':
      return 'Premium';
    default:
      return 'Hobby'; // Default to 'Hobby' if no matching key is found
  }
}
//@ts-ignore
async function updateUserSubscriptionStatus(userId, newStatus, eventType) {
  const currentUser = await db.select({
    planType: users.planType
  })
    .from(users)
    .where(eq(users.customerId, userId))
    .execute();

  if (!currentUser || currentUser.length === 0) {
    console.error(`User not found with ID: ${userId}`);
    return;
  }

  const currentStatus = currentUser[0].planType;

  if (currentStatus === newStatus) {
    console.log(`No change in subscription status for user ${userId}`);
  } else {
    await db.update(users)
      .set({ planType: newStatus })
      .where(eq(users.customerId, userId))
      .execute();

    console.log(`Updating user ${userId} subscription status to ${newStatus} due to ${eventType}`);
  }
}
//@ts-ignore
async function isInvoicePaid(invoiceId) {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice.paid;
  } catch (err) {
    //@ts-ignore
    console.error(`Error retrieving invoice: ${err.message}`);
    return false;
  }
}
"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq } from 'drizzle-orm';
import { faschingRequests, faschingTickets } from '@/schema/schema';
import { sendFaschingTicketEmail } from '@/server/mailer';

const db = drizzle(sql);

const TICKET_PRICES = {
  fasching: 10,
  fasching_after: 25,
};

function normalizeTicketType(type: string) {
  if (type === 'fasching-after') return 'fasching_after';
  return type;
}

export async function verifyFaschingCode({ paymentCode }: { paymentCode: string }) {
  try {
    const [request] = await db.select()
      .from(faschingRequests)
      .where(eq(faschingRequests.paymentCode, paymentCode))
      .execute();

    if (!request) {
      return { success: false, message: 'Няма такава поръчка' };
    }
    if (request.deleted) {
      return { success: false, message: 'Поръчката е изтрита' };
    }

    const tickets = await db.select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, request.id))
      .execute();

    let faschingCount = 0;
    let faschingAfterCount = 0;
    let totalDue = 0;

    tickets.forEach(ticket => {
      const norm = normalizeTicketType(ticket.ticketType);
      if (norm === 'fasching') {
        faschingCount++;
        totalDue += TICKET_PRICES.fasching;
      } else if (norm === 'fasching_after') {
        faschingAfterCount++;
        totalDue += TICKET_PRICES.fasching_after;
      }
    });

    return {
      success: true,
      order: request,
      tickets,
      faschingCount,
      faschingAfterCount,
      totalDue,
    };
  } catch (error) {
    console.error('verifyFaschingCode error:', error);
    return { success: false, message: 'Грешка при проверка на поръчката' };
  }
}

export async function confirmFaschingPayment({
  requestId,
  paidAmount,
  sellerId
}: {
  requestId: number,
  paidAmount: number,
  sellerId: string
}) {
  try {
    const [request] = await db.select()
      .from(faschingRequests)
      .where(eq(faschingRequests.id, requestId))
      .execute();

    if (!request) {
      return { success: false, message: 'Няма такава поръчка' };
    }
    if (request.deleted) {
      return { success: false, message: 'Поръчката е изтрита' };
    }
    if (request.paid) {
      return { success: false, message: 'Тази поръчка вече е платена' };
    }

    const tickets = await db.select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, requestId))
      .execute();

    // Calculate totalDue
    let totalDue = 0;
    for (const t of tickets) {
      const norm = normalizeTicketType(t.ticketType);
      if (norm === 'fasching') {
        totalDue += TICKET_PRICES.fasching;
      } else if (norm === 'fasching_after') {
        totalDue += TICKET_PRICES.fasching_after;
      }
    }

    if (paidAmount < totalDue) {
      return {
        success: false,
        message: `Недостатъчна сума. Дължимо: ${totalDue} лв, платено: ${paidAmount} лв.`,
      };
    }

    // Mark paid & seller
    await db.update(faschingRequests)
      .set({
        paid: true,
        sellerId: sellerId,
      })
      .where(eq(faschingRequests.id, requestId))
      .execute();

    for (const ticket of tickets) {
      let code = ticket.ticketCode;
      if (!code) {
        code = generate10DigitCode();
        // Update in DB
        await db.update(faschingTickets)
          .set({ ticketCode: code })
          .where(eq(faschingTickets.id, ticket.id))
          .execute();
      }

      // Send email
      const ticketUrl = generateTicketUrl(code);
      await sendFaschingTicketEmail({
        guestEmail: ticket.guestEmail,
        guestFirstName: ticket.guestFirstName,
        guestLastName: ticket.guestLastName,
        ticketCode: code,
        ticketType: ticket.ticketType,
        ticketUrl,
      });
    }

    const change = paidAmount - totalDue;
    return {
      success: true,
      totalDue,
      paidAmount,
      change,
      message: `Плащането е потвърдено. Ресто: ${change} лв.`
    };
  } catch (error) {
    console.error('confirmFaschingPayment error:', error);
    return { success: false, message: 'Грешка при потвърждаване на плащането' };
  }
}

function generate10DigitCode(): string {
  let r = Math.random().toString().slice(2, 12);
  if (r.length < 10) {
    r = r.padStart(10, '0');
  }
  return r;
}

function generateTicketUrl(ticketCode: string): string {
  const jwt = require('jsonwebtoken');
  const payload = { ticketCode };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return `https://tickets.eventify.bg/${token}`;
}
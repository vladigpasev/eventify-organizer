"use server";

import { randomBytes } from "crypto"; // Вмъкваме crypto за сигурни произволни стойности
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { eq } from "drizzle-orm";

import { faschingRequests, faschingTickets } from "@/schema/schema";
import { sendFaschingTicketEmail } from "@/server/mailer";

// Инициализираме drizzle с нашата връзка
const db = drizzle(sql);

// Цени на различните видове билети
const TICKET_PRICES = {
  fasching: 10,
  fasching_after: 25,
};

function normalizeTicketType(type: string) {
  if (type === "fasching-after") return "fasching_after";
  return type;
}

/**
 * Проверява поръчка по неин paymentCode
 */
export async function verifyFaschingCode({ paymentCode }: { paymentCode: string }) {
  try {
    const [request] = await db
      .select()
      .from(faschingRequests)
      .where(eq(faschingRequests.paymentCode, paymentCode))
      .execute();

    if (!request) {
      return { success: false, message: "Няма такава поръчка" };
    }
    if (request.deleted) {
      return { success: false, message: "Поръчката е изтрита" };
    }

    const tickets = await db
      .select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, request.id))
      .execute();

    let faschingCount = 0;
    let faschingAfterCount = 0;
    let totalDue = 0;

    tickets.forEach((ticket) => {
      const norm = normalizeTicketType(ticket.ticketType);
      if (norm === "fasching") {
        faschingCount++;
        totalDue += TICKET_PRICES.fasching;
      } else if (norm === "fasching_after") {
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
    console.error("verifyFaschingCode error:", error);
    return { success: false, message: "Грешка при проверка на поръчката" };
  }
}

/**
 * Потвърждава плащане за дадена поръчка, генерира кодове (ако няма),
 * изпраща email-и с билети и изчислява ресто.
 */
export async function confirmFaschingPayment({
  requestId,
  paidAmount,
  sellerId,
}: {
  requestId: number;
  paidAmount: number;
  sellerId: string;
}) {
  try {
    const [request] = await db
      .select()
      .from(faschingRequests)
      .where(eq(faschingRequests.id, requestId))
      .execute();

    if (!request) {
      return { success: false, message: "Няма такава поръчка" };
    }
    if (request.deleted) {
      return { success: false, message: "Поръчката е изтрита" };
    }
    if (request.paid) {
      return { success: false, message: "Тази поръчка вече е платена" };
    }

    const tickets = await db
      .select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, requestId))
      .execute();

    // Пресмятаме колко е дължимото
    let totalDue = 0;
    for (const t of tickets) {
      const norm = normalizeTicketType(t.ticketType);
      if (norm === "fasching") {
        totalDue += TICKET_PRICES.fasching;
      } else if (norm === "fasching_after") {
        totalDue += TICKET_PRICES.fasching_after;
      }
    }

    if (paidAmount < totalDue) {
      return {
        success: false,
        message: `Недостатъчна сума. Дължимо: ${totalDue} лв, платено: ${paidAmount} лв.`,
      };
    }

    // Маркираме поръчката като платена + запазваме данни за продавача
    await db
      .update(faschingRequests)
      .set({
        paid: true,
        sellerId: sellerId,
      })
      .where(eq(faschingRequests.id, requestId))
      .execute();

    // Генерираме код за всеки билет (ако няма) и изпращаме email
    for (const ticket of tickets) {
      let code = ticket.ticketCode;
      if (!code) {
        code = generate10DigitCode();
        // Ъпдейтваме кода в базата
        await db
          .update(faschingTickets)
          .set({ ticketCode: code })
          .where(eq(faschingTickets.id, ticket.id))
          .execute();
      }

      // Изпращаме имейл с линк към билета
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
      message: `Плащането е потвърдено. Ресто: ${change} лв.`,
    };
  } catch (error) {
    console.error("confirmFaschingPayment error:", error);
    return { success: false, message: "Грешка при потвърждаване на плащането" };
  }
}

/**
 * Генерира 10-цифрен код по криптографски сигурен начин.
 * Използваме randomBytes(6) (~48 бита ентропия), превръщаме го в число,
 * ограничаваме до 10 цифри и падваме с нули отпред при нужда.
 */
function generate10DigitCode(): string {
  const buffer = randomBytes(6); // 48 бита - достатъчно за >10^10 комбинации
  const randomNum = parseInt(buffer.toString("hex"), 16) % 1_000_000_0000;
  return randomNum.toString().padStart(10, "0");
}

/**
 * Генерира URL за билет, в който JWT криптографски съдържа ticketCode.
 */
function generateTicketUrl(ticketCode: string): string {
  const jwt = require("jsonwebtoken");
  const payload = { ticketCode };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return `https://tickets.eventify.bg/${token}`;
}
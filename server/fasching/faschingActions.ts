"use server";

import { randomBytes } from "crypto";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { eq } from "drizzle-orm";
import { faschingRequests, faschingTickets } from "@/schema/schema";

import {
  sendFaschingTicketEmail,
  sendFaschingAfterUpgradeEmail,
} from "@/server/mailer";

const db = drizzle(sql);

// Цени на билетите (string ключове)
const TICKET_PRICES: Record<string, number> = {
  "fasching": 10,
  "fasching-after": 25,
};

/**
 * normalizeTicketType:
 * - Ако получим "fasching_after" -> ще го превърнем в "fasching-after"
 * - Иначе го връщаме както е.
 */
function normalizeTicketType(type: string) {
  if (type === "fasching_after") return "fasching-after";
  return type;
}

/**
 * Проверява съществуване на поръчка по неин paymentCode
 */
export async function verifyFaschingCode({
  paymentCode,
}: {
  paymentCode: string;
}) {
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
        totalDue += TICKET_PRICES["fasching"];
      } else if (norm === "fasching-after") {
        faschingAfterCount++;
        totalDue += TICKET_PRICES["fasching-after"];
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
 * Потвърждава плащане на цялата поръчка (първоначално).
 * Генерира code за билетите, изпраща имейли, изчислява ресто и т.н.
 * + Добавяме в имейла линк за гласуване (https://fasching.eventify.bg/vote?token=...)
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
    // 1) Търсим поръчката
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

    // 2) Намираме билетите
    const tickets = await db
      .select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, requestId))
      .execute();

    // 3) Пресмятаме обща дължима сума
    let totalDue = 0;
    for (const t of tickets) {
      const norm = normalizeTicketType(t.ticketType);
      totalDue += TICKET_PRICES[norm] || 0;
    }

    // 4) Проверка дали платеното е достатъчно
    if (paidAmount < totalDue) {
      return {
        success: false,
        message: `Недостатъчна сума. Дължимо: ${totalDue} лв, платено: ${paidAmount} лв.`,
      };
    }

    // 5) Маркираме поръчката като платена
    await db
      .update(faschingRequests)
      .set({
        paid: true,
        sellerId: sellerId,
      })
      .where(eq(faschingRequests.id, requestId))
      .execute();

    // 6) Генерираме code за билетите (ако нямат), генерираме voteUrl и изпращаме имейли
    for (const ticket of tickets) {
      let code = ticket.ticketCode;
      if (!code) {
        code = generate10DigitCode();
        await db
          .update(faschingTickets)
          .set({ ticketCode: code })
          .where(eq(faschingTickets.id, ticket.id))
          .execute();
      }

      // Линк за преглед/изтегляне на билета (примерно QR)
      const ticketUrl = generateTicketUrl(code);

      // Линк за гласуване (JWT)
      const voteUrl = generateVoteUrl(code);

      await sendFaschingTicketEmail({
        guestEmail: ticket.guestEmail,
        guestFirstName: ticket.guestFirstName,
        guestLastName: ticket.guestLastName,
        ticketCode: code,
        ticketType: ticket.ticketType,
        ticketUrl,
        voteUrl, // <-- тук минава и линк за гласуване
      });
    }

    // 7) Ресто
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
 * Потвърждава upgrade (доплащане) от "fasching" на "fasching-after".
 * - доплащане: 15 лв (25 - 10)
 * - записва се upgraderSellerId
 * - изпраща имейл
 */
export async function confirmAddAfterUpgrade({
  ticketId,
  paidAmount,
  sellerId,
}: {
  ticketId: number;
  paidAmount: number;
  sellerId: string;
}) {
  try {
    // 1) Взимаме билета
    const [ticket] = await db
      .select()
      .from(faschingTickets)
      .where(eq(faschingTickets.id, ticketId))
      .execute();

    if (!ticket) {
      return { success: false, message: "Няма такъв билет." };
    }
    if (ticket.ticketType === "fasching-after") {
      return { success: false, message: "Този билет вече е 'fasching-after'." };
    }
    if (ticket.ticketType !== "fasching") {
      return { success: false, message: "Този билет не е 'fasching'." };
    }

    // 2) Търсим поръчката
    const [request] = await db
      .select()
      .from(faschingRequests)
      .where(eq(faschingRequests.id, ticket.requestId))
      .execute();

    if (!request) {
      return { success: false, message: "Няма такава поръчка." };
    }
    if (request.deleted) {
      return { success: false, message: "Поръчката е изтрита." };
    }

    // Ако поръчката не е платена => не можем да ъпгрейднем
    if (!request.paid) {
      return {
        success: false,
        message: "Не може да добавите 'After' на неплатен билет.",
      };
    }

    const upgradeCost = 15; // (25 - 10)
    if (paidAmount < upgradeCost) {
      return {
        success: false,
        message: `Недостатъчна сума. Необходими са 15 лв, получено: ${paidAmount} лв.`,
      };
    }

    // Ъпдейтваме билета
    await db
      .update(faschingTickets)
      .set({
        ticketType: "fasching-after",
        upgraderSellerId: sellerId,
      })
      .where(eq(faschingTickets.id, ticketId))
      .execute();

    const change = paidAmount - upgradeCost;

    // Изпращаме имейл за upgrade
    await sendFaschingAfterUpgradeEmail({
      guestEmail: ticket.guestEmail,
      guestFirstName: ticket.guestFirstName,
      guestLastName: ticket.guestLastName,
      ticketCode: ticket.ticketCode || "",
      ticketUrl: generateTicketUrl(ticket.ticketCode || ""),
    });

    return {
      success: true,
      message: "Успешно добавен After!",
      change,
    };
  } catch (error) {
    console.error("confirmAddAfterUpgrade error:", error);
    return {
      success: false,
      message: "Грешка при ъпгрейд до 'fasching-after'.",
    };
  }
}

// -------------------------------------
// Helper функции
// -------------------------------------

/**
 * Генерираме 10-цифрен код (zero-padded) от random 6 bytes.
 */
function generate10DigitCode(): string {
  const buffer = randomBytes(6); // 6 байта = 12 hex символа
  // Преобразуваме го в число и взимаме модул 10^10, 
  // за да не надхвърля 10 цифри.
  const randomNum = parseInt(buffer.toString("hex"), 16) % 1_000_000_0000;
  return randomNum.toString().padStart(10, "0");
}

/**
 * Линк за преглед / сваляне на билета (пример: QR)
 */
function generateTicketUrl(ticketCode: string): string {
  const jwt = require("jsonwebtoken");
  const payload = { ticketCode };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  // Пример: имаш си страница, която показва QR или нещо такова
  return `https://tickets.eventify.bg/${token}`;
}

/**
 * Линк за гласуване:
 * https://fasching.eventify.bg/vote?token=<JWT>
 */
function generateVoteUrl(ticketCode: string): string {
  const jwt = require("jsonwebtoken");
  const payload = { ticketCode };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return `https://fasching.eventify.bg/vote?token=${token}`;
}

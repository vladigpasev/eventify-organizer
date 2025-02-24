"use server";

import { randomBytes } from "crypto";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { eq } from "drizzle-orm";

import { faschingRequests, faschingTickets } from "@/schema/schema";
import { sendFaschingTicketEmail, sendFaschingAfterUpgradeEmail } from "@/server/mailer";

const db = drizzle(sql);

// Цени на билетите (string ключове)
const TICKET_PRICES: Record<string, number> = {
  "fasching": 10,
  "fasching-after": 25,
};

/**
 * normalizeTicketType:
 * - Ако получим "fasching-after" -> така го оставяме
 * - Ако е "fasching_after" (с долна черта) -> ще го превърнем в "fasching-after"
 */
function normalizeTicketType(type: string) {
  if (type === "fasching_after") return "fasching-after";
  return type;
}

/**
 * Пример: проверява съществуване на поръчка по неин paymentCode
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
 * Генерира кодове за билетите, изпраща имейли, изчислява ресто и т.н.
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

    // Намираме билетите
    const tickets = await db
      .select()
      .from(faschingTickets)
      .where(eq(faschingTickets.requestId, requestId))
      .execute();

    let totalDue = 0;
    for (const t of tickets) {
      const norm = normalizeTicketType(t.ticketType);
      // "fasching" -> 10, "fasching-after" -> 25
      totalDue += TICKET_PRICES[norm] || 0;
    }

    if (paidAmount < totalDue) {
      return {
        success: false,
        message: `Недостатъчна сума. Дължимо: ${totalDue} лв, платено: ${paidAmount} лв.`,
      };
    }

    // Маркираме поръчката като платена
    await db
      .update(faschingRequests)
      .set({
        paid: true,
        sellerId: sellerId,
      })
      .where(eq(faschingRequests.id, requestId))
      .execute();

    // Генерираме code за всеки билет (ако няма) и изпращаме имейл
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
 * Потвърждава upgrade (доплащане) от "fasching" на "fasching-after".
 * - ticketType: "fasching" -> "fasching-after"
 * - Записва се кой е upgraderSellerId
 * - Доплащане: 15 лв (25 - 10)
 * - Връща колко е ресто (ако е платено над 15)
 * - Изпраща имейл
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

    // ➜ Новата проверка: ако поръчката не е платена => не можем да добавим After
    if (!request.paid) {
      return { success: false, message: "Не може да добавите 'After' на неплатен билет." };
    }

    // ... после логиката за доплащане:
    const upgradeCost = 15;
    if (paidAmount < upgradeCost) {
      return {
        success: false,
        message: `Недостатъчна сума. Необходими са 15 лв, получено: ${paidAmount} лв.`,
      };
    }

    // Ъпдейтваме на "fasching-after" + записваме upgraderSellerId
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
      ticketCode: ticket.ticketCode || undefined,
      ticketUrl: generateTicketUrl(ticket.ticketCode || ""),
    });

    return {
      success: true,
      message: "Успешно добавен After!",
      change,
    };
  } catch (error) {
    console.error("confirmAddAfterUpgrade error:", error);
    return { success: false, message: "Грешка при ъпгрейд до 'fasching-after'." };
  }
}


// -------------------------------------
// Helper функции
// -------------------------------------
function generate10DigitCode(): string {
  const buffer = randomBytes(6); 
  const randomNum = parseInt(buffer.toString("hex"), 16) % 1_000_000_0000;
  return randomNum.toString().padStart(10, "0");
}

function generateTicketUrl(ticketCode: string): string {
  const jwt = require("jsonwebtoken");
  const payload = { ticketCode };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return `https://tickets.eventify.bg/${token}`;
}

/**
 * (По желание) Старият addAfterToTicket, ако още ви трябва.
 * Само сменя ticketType, без да смята пари.
 */
// export async function addAfterToTicket({ ticketId }: { ticketId: number }) {
//   try {
//     const [ticket] = await db
//       .select()
//       .from(faschingTickets)
//       .where(eq(faschingTickets.id, ticketId))
//       .execute();
//     ...
//   } catch (error) {
//     ...
//   }
// }

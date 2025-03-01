"use server";

import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { faschingVotes } from "@/schema/schema";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import { VOTE_CATEGORIES } from "./voteData";

const db = drizzle(sql);

// Helper: find the category object by ID
function findCategoryById(id: string) {
  return VOTE_CATEGORIES.find((cat) => cat.id === id);
}

// Helper: find the nominee’s real name
function findNomineeName(categoryId: string, nomineeId: string): string {
  const cat = findCategoryById(categoryId);
  if (!cat) return nomineeId; // fallback
  const nominee = cat.nominees.find((n) => n.id === nomineeId);
  return nominee ? nominee.name : nomineeId;
}

/**
 * Get the votes for a single ticket, returning { categoryTitle, nomineeName } per vote.
 * Сега ще изискваме userIsAdmin: boolean, за да позволим достъп.
 */
export async function getTicketVotes(
  ticketId: number,
  { userIsAdmin }: { userIsAdmin: boolean }
) {
  if (!userIsAdmin) {
    throw new Error("Unauthorized to view votes for a single ticket.");
  }

  const results = await db
    .select({
      categoryId: faschingVotes.categoryId,
      nomineeId: faschingVotes.nomineeId,
    })
    .from(faschingVotes)
    .where(eq(faschingVotes.ticketId, ticketId))
    .execute();

  return results.map((row) => ({
    categoryTitle: findCategoryById(row.categoryId)?.title || row.categoryId,
    nomineeName: findNomineeName(row.categoryId, row.nomineeId),
  }));
}

/**
 * getFaschingStats: returns an object keyed by the category’s "title" (not ID), preserving order.
 * Добавяме проверка за userIsAdmin.
 */
export async function getFaschingStats({ userIsAdmin }: { userIsAdmin: boolean }) {
  if (!userIsAdmin) {
    throw new Error("Unauthorized to view Fasching Stats.");
  }

  // 1) Get raw vote counts
  const rows = await db
    .select({
      categoryId: faschingVotes.categoryId,
      nomineeId: faschingVotes.nomineeId,
      total: drizzleSql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(faschingVotes)
    .groupBy(faschingVotes.categoryId, faschingVotes.nomineeId)
    .orderBy(faschingVotes.categoryId, desc(drizzleSql<number>`COUNT(*)`))
    .execute();

  // 2) Build a map: catId => { nomineeId, votes }[]
  const catMap: Record<string, Array<{ nomineeId: string; votes: number }>> = {};
  for (const row of rows) {
    if (!catMap[row.categoryId]) {
      catMap[row.categoryId] = [];
    }
    catMap[row.categoryId].push({
      nomineeId: row.nomineeId,
      votes: row.total,
    });
  }

  // 3) Build the final stats object
  const finalStats: Record<
    string,
    Array<{ nomineeId: string; nomineeName: string; votes: number }>
  > = {};

  for (const cat of VOTE_CATEGORIES) {
    const catId = cat.id;
    const catEntries = catMap[catId] || [];

    catEntries.sort((a, b) => b.votes - a.votes);

    const mapped = catEntries.map((entry) => ({
      nomineeId: entry.nomineeId,
      nomineeName: findNomineeName(catId, entry.nomineeId),
      votes: entry.votes,
    }));

    finalStats[cat.title] = mapped;
  }

  return finalStats;
}

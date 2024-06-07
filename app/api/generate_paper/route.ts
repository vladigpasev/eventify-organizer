import type { NextRequest } from 'next/server';
import { paperTickets } from '@/schema/schema';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';

const db = drizzle(sql);

// Define the fixed access token
const FIXED_ACCESS_TOKEN = process.env.FIXED_ACCESS_TOKEN || 'HaGER8QJm4v4KIWOL6qxxCSjUsOp45uj1mjyv4rhO6QdFd9CHB0JYpMEITWWP6rI';

// Function to generate a unique nine-digit code
async function generateUniqueNineDigitCode() {
    let isUnique = false;
    let code;

    while (!isUnique) {
        code = Math.floor(100000000 + Math.random() * 900000000).toString();
        const existingCode = await db.select().from(paperTickets).where(eq(paperTickets.nineDigitCode, code)).execute();
        if (existingCode.length === 0) {
            isUnique = true;
        }
    }

    return code;
}

export async function POST(request: NextRequest) {
    // Check the access token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${FIXED_ACCESS_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const payload = await request.json();
        const { eventUuid, ticketCount } = payload;

        // Validate the payload
        if (!eventUuid || !ticketCount || typeof ticketCount !== 'number') {
            return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
        }

        // Prepare the array for insertion with unique nine-digit codes
        const values = [];
        for (let i = 0; i < ticketCount; i++) {
            const nineDigitCode = await generateUniqueNineDigitCode();
            values.push({ eventUuid, nineDigitCode });
        }

        // Insert all records at once
        //@ts-ignore
        const insertResult = await db.insert(paperTickets).values(values).returning({ uuid: paperTickets.uuid, nineDigitCode: paperTickets.nineDigitCode }).execute();

        // Generate tokens for each record
        const tokens = insertResult.map(result => {
            const token = jwt.sign({ uuid: result.uuid, paper: true, nineDigitCode: result.nineDigitCode }, process.env.JWT_SECRET);
            return { token, nineDigitCode: result.nineDigitCode };
        });

        return new Response(JSON.stringify({ tokens }), {
            status: 200
        });
    } catch (error) {
        console.error('Error processing request', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

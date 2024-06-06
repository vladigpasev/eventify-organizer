import type { NextRequest } from 'next/server';
import { paperTickets } from '@/schema/schema';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
//@ts-ignore
import jwt from 'jsonwebtoken';

const db = drizzle(sql);

// Define the fixed access token
const FIXED_ACCESS_TOKEN = process.env.FIXED_ACCESS_TOKEN || 'HaGER8QJm4v4KIWOL6qxxCSjUsOp45uj1mjyv4rhO6QdFd9CHB0JYpMEITWWP6rI';

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

        // Prepare the array for insertion
        const values = Array(ticketCount).fill({ eventUuid: eventUuid });

        // Insert all records at once
        const insertResult = await db.insert(paperTickets).values(values).returning({ uuid: paperTickets.uuid }).execute();

        // Generate tokens for each record
        const tokens = insertResult.map(result => jwt.sign({ uuid: result.uuid, paper: true }, process.env.JWT_SECRET));

        return new Response(JSON.stringify({ tokens }), {
            status: 200
        });
    } catch (error) {
        console.error('Error processing request', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}

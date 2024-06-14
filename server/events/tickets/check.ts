'use server';
import { z } from 'zod';
//@ts-ignore
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eventCustomers, paperTickets, users } from '../../../schema/schema';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const db = drizzle(sql);

export async function checkTicket(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        qrData: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.qrData;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        let customerUuid;
        let nineDigitCode;
        if (decodedTicketToken.paper) {
            const paperUuid = decodedTicketToken.uuid;
            const currentPaperTicketDb = await db.select({
                assignedCustomer: paperTickets.assignedCustomer,
                nineDigitCode: paperTickets.nineDigitCode,
            })
                .from(paperTickets)
                .where(eq(paperTickets.uuid, paperUuid))
                .execute();
            const currentPaperTicket = currentPaperTicketDb[0];
            customerUuid = currentPaperTicket.assignedCustomer;
            nineDigitCode = currentPaperTicket.nineDigitCode;
        } else {
            customerUuid = decodedTicketToken.uuid;
            nineDigitCode = undefined;
        }

        const currentCustomerDb = await db.select({
            firstName: eventCustomers.firstname,
            lastName: eventCustomers.lastname,
            email: eventCustomers.email,
            guestCount: eventCustomers.guestCount,
            eventUuid: eventCustomers.eventUuid,
            isEntered: eventCustomers.isEntered,
            createdAt: eventCustomers.createdAt,
            sellerUuid: eventCustomers.sellerUuid,
            reservation: eventCustomers.reservation,
        })
            .from(eventCustomers)
            .where(eq(eventCustomers.uuid, customerUuid))
            .execute();
        const currentCustomer = currentCustomerDb[0];
        let sellerName;
        let sellerEmail;
        if (currentCustomer.sellerUuid) {
            const sellerDb = await db.select({
                firstName: users.firstname,
                lastName: users.lastname,
                email: users.email,
            })
                .from(users)
                .where(eq(users.uuid, currentCustomer.sellerUuid))
                .execute();
            const seller = sellerDb[0];
            sellerName = `${seller.firstName} ${seller.lastName}`;
            sellerEmail = seller.email;
        } else {
            sellerName = null;
            sellerEmail = null;
        }

        // Convert createdAt to dd.mm.YYYY, HH:mm:ss format in Sofia's time zone
        //@ts-ignore
        const createdAt = new Date(currentCustomer.createdAt);
        const sofiaTimeOptions = {
            timeZone: 'Europe/Sofia',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        //@ts-ignore
        const sofiaTimeFormatter = new Intl.DateTimeFormat('en-GB', sofiaTimeOptions);
        const parts = sofiaTimeFormatter.formatToParts(createdAt);
        const formattedCreatedAt = `${parts[0].value}.${parts[2].value}.${parts[4].value}, ${parts[6].value}:${parts[8].value}:${parts[10].value}`;

        const response = {
            ...currentCustomer,
            createdAt: formattedCreatedAt,
            nineDigitCode,
            sellerName: sellerName,
            sellerEmail: sellerEmail,
        }

        if (currentCustomer.eventUuid !== validatedData.eventUuid) {
            return ({ success: false });
        }
        return ({ success: true, response });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}

export async function markAsEntered(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        ticketToken: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.ticketToken;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        let customerUuid;
        if (decodedTicketToken.paper) {
            const paperUuid = decodedTicketToken.uuid;
            const currentPaperTicketDb = await db.select({
                assignedCustomer: paperTickets.assignedCustomer,
            })
                .from(paperTickets)
                .where(eq(paperTickets.uuid, paperUuid))
                .execute();
            const currentPaperTicket = currentPaperTicketDb[0];
            customerUuid = currentPaperTicket.assignedCustomer;
        } else {
            customerUuid = decodedTicketToken.uuid;
        }
        await db.update(eventCustomers)
            .set({
                isEntered: true,
            })
            .where(eq(eventCustomers.uuid, customerUuid));

        return ({ success: true });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}

export async function markAsExited(data: any) {
    // Define a schema for event data validation
    const ticketSchema = z.object({
        ticketToken: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.ticketToken;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        let customerUuid;
        if (decodedTicketToken.paper) {
            const paperUuid = decodedTicketToken.uuid;
            const currentPaperTicketDb = await db.select({
                assignedCustomer: paperTickets.assignedCustomer,
            })
                .from(paperTickets)
                .where(eq(paperTickets.uuid, paperUuid))
                .execute();
            const currentPaperTicket = currentPaperTicketDb[0];
            customerUuid = currentPaperTicket.assignedCustomer;
        } else {
            customerUuid = decodedTicketToken.uuid;
        }
        await db.update(eventCustomers)
            .set({
                isEntered: false,
            })
            .where(eq(eventCustomers.uuid, customerUuid));

        return ({ success: true });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}

export async function markAsPaid(data: any) {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userUuid = decodedToken.uuid;
    // Define a schema for event data validation
    const ticketSchema = z.object({
        ticketToken: z.string().nonempty(),
        eventUuid: z.string().nonempty(),
    });
    const validatedData = ticketSchema.parse(data);
    try {
        const ticketToken = validatedData.ticketToken;
        const decodedTicketToken = await jwt.verify(ticketToken, process.env.JWT_SECRET);
        let customerUuid;
        if (decodedTicketToken.paper) {
            const paperUuid = decodedTicketToken.uuid;
            const currentPaperTicketDb = await db.select({
                assignedCustomer: paperTickets.assignedCustomer,
            })
                .from(paperTickets)
                .where(eq(paperTickets.uuid, paperUuid))
                .execute();
            const currentPaperTicket = currentPaperTicketDb[0];
            customerUuid = currentPaperTicket.assignedCustomer;
        } else {
            customerUuid = decodedTicketToken.uuid;
        }
        await db.update(eventCustomers)
            .set({
                reservation: false,
                sellerUuid: userUuid,
            })
            .where(eq(eventCustomers.uuid, customerUuid));

        return ({ success: true });
    } catch (err) {
        console.log(err)
        return ({ success: false });
    }
}
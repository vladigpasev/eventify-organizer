'use server';
import { z } from 'zod';
//@ts-ignore
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { events, users } from '../../schema/schema';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'
//@ts-ignore
import nodemailer from 'nodemailer';
import { redirect } from 'next/navigation';

const db = drizzle(sql);




export async function editTitle(data: any) {
    return { message: "Coming soon" }

}
'use server';
import { z } from 'zod';
//@ts-ignore
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { users } from '../schema/schema';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
//@ts-ignore
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'


const db = drizzle(sql);


export async function registerUser(data: any) {
    const userSchema = z.object({
        firstname: z.string(),
        lastname: z.string(),
        company: z.string(),
        email: z.string().email(),
        password: z.string().min(10).max(100),
        confirmPassword: z.string(),
    }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });
    console.log('Received data:', data);
    if (!data || typeof data !== 'object') {
        console.error('Invalid input data:', data);
        return { success: false, message: 'Invalid input data' };
    }
    // Validate the data against the schema
    const validationResult = userSchema.safeParse(data);
    if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error);
        return { success: false, message: 'Validation failed' };
    }

    // Proceed if data is valid
    try {
        console.log('Registering user:', data);

        // Hash the password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user: InferInsertModel<typeof users> = {
            firstname: data.firstname,
            lastname: data.lastname,
            company: data.company,
            email: data.email,
            password: hashedPassword
        };

        // Insert user data into the database using Drizzle's correct insert method
        const result = await db.insert(users).values(user).execute();

        console.log('User registered successfully', result);
        return { success: true, message: 'User registered successfully' };
    } catch (error) {
        console.error('Registration failed:', error);

        // Parse the error message to a JSON object.
        let errorMessage = JSON.stringify(error);
        let errorObj = JSON.parse(errorMessage);

        // Check if the error is specifically about the email already existing.
        if (errorObj.code === "23505" && errorObj.detail.includes("already exists")) {
            return { success: false, message: "The email already exists. Please use a different email." };
        } else {
            // For all other errors, return a generic registration failed message.
            return { success: false, message: "Registration failed. Please try again or contact Eventify support." };
        }
    }

}

export async function loginUser(data: any) {
    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    });
    console.log('Received login data:', data);
    if (!data || typeof data !== 'object') {
        console.error('Invalid login data:', data);
        return { success: false, message: 'Invalid login data' };
    }
    // Validate the data against the schema
    const validationResult = loginSchema.safeParse(data);
    if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error);
        return { success: false, message: 'Please fill all fields correctly!' };
    }

    // Proceed if data is valid
    try {
        console.log('Authenticating user:', data);

        // Retrieve user from the database
        const userQueryResult = await db.select({
            uuid: users.uuid,
            email: users.email,
            password: users.password,
            email_verified: users.email_verified
        })
            .from(users)
            .where(eq(users.email, data.email))
            .execute();


        // Check if user exists
        if (userQueryResult.length > 0) {
            // There are results
        } else {
            return { success: false, message: 'User not found' };
        }


        const user = userQueryResult[0];

        // Compare the hashed passwords
        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            return { success: false, message: 'Invalid password' };
        }

        console.log('User authenticated successfully');
        const token = jwt.sign({ uuid: user.uuid, email_verified: user.email_verified }, process.env.JWT_SECRET, { expiresIn: '1h' });
        cookies().set({
            name: 'token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 3600,
            sameSite: 'strict',
        })

        return { success: true, message: 'User authenticated successfully' };

    } catch (error) {
        console.error('Authentication failed:', error);
        return { success: false, message: 'Authentication failed. Please try again or contact Eventify support.' };
    }
}
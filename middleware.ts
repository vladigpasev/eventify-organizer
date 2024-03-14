// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Converts URL-safe base64 to regular base64
function urlSafeBase64Decode(base64String: string) {
    return base64String.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64String.length + (4 - base64String.length % 4) % 4, '=');
}

//Custom verifyJwt function, because crypto is not supported in edge functions
async function verifyJwt(token: any, secret: any) {
    // Decode the JWT without verifying to get the header and payload
    const parts = token.split('.');
    //@ts-ignore
    if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9\-_]+={0,2}$/.test(part))) {
        throw new Error('Invalid token format');
    }

    const header = JSON.parse(atob(urlSafeBase64Decode(parts[0])));
    const payload = JSON.parse(atob(urlSafeBase64Decode(parts[1])));

    // Ensure the algorithm is HS256
    if (header.alg !== 'HS256') {
        throw new Error('Invalid algorithm. The token must be signed with HS256.');
    }

    // Prepare the signing input
    const textEncoder = new TextEncoder();
    const signingInput = textEncoder.encode(parts.slice(0, 2).join('.'));

    // Prepare the key
    const keyData = textEncoder.encode(secret);
    const algorithm = { name: 'HMAC', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey('raw', keyData, algorithm, false, ['verify']);

    // Prepare the signature
    const signature = Uint8Array.from(atob(urlSafeBase64Decode(parts[2])), c => c.charCodeAt(0));

    // Verify the signature
    const signatureIsValid = await crypto.subtle.verify(algorithm, key, signature, signingInput);
    if (!signatureIsValid) {
        throw new Error('Invalid signature');
    }

    // Check for token expiration
    const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds since epoch
    if (payload.exp && currentTimestamp >= payload.exp) {
        throw new Error('Token is expired');
    }

    // Return the payload if the token is valid and not expired
    return payload;
}

export async function middleware(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            // If no token, redirect to login
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
        const jwt_secret = process.env.JWT_SECRET;
        // Verify and decode the token
        const decoded: any = await verifyJwt(token, jwt_secret);

        if (!decoded || !decoded.uuid) {
            throw new Error('Invalid token');
        }

        if (!decoded.email_verified) {
            // Redirect to email verification if the email isn't verified
            return NextResponse.redirect(new URL('/auth/email-verify', request.url));
        }

        // Redirect to payment setup if the user's payment is not set
        if (!decoded.setpayment) {
            return NextResponse.redirect(new URL('/auth/paymentsetup', request.url));
        }

        // User is verified and payment is set, allow them to continue
        
        return NextResponse.next();

    } catch (error) {
        console.error('Error in middleware:', error);
        // In case of any error, redirect to login
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }
}


export const config = {
    matcher: [
        '/((?!auth|api|images|_next/static|_next/image|favicon.ico|logo.png).*)',
    ],
}

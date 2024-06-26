//Copyright (C) 2024  Vladimir Pasev
import { cookies } from 'next/headers';
import React from 'react'
//@ts-ignore
import jwt from 'jsonwebtoken';
import { createPayoutLink } from '@/server/payment/payout';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  });
  
async function PayoutWarning() {
    const token = cookies().get("token")?.value;
    const decodedToken = jwt.decode(token);
    const account = await stripe.accounts.retrieve(decodedToken.payoutId);
    console.log(JSON.stringify(decodedToken))
    if (!account.payouts_enabled) {
        return (
            <div>
                <div className='px-2'>
                    <div role="alert" className="alert alert-warning mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span>Предупреждение: Не са попълнени данните за изплащане на организацията! <form action={createPayoutLink}><button type='submit' className='link'>Попълни сега</button></form></span>
                    </div>
                </div>
            </div>
        )
    } else {
        return null;
    }

}

export default PayoutWarning
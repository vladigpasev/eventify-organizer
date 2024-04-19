//Copyright (C) 2024  Vladimir Pasev
"use client"
import { sendEmail } from '@/server/auth';
import React, { useState, useEffect } from 'react';

function SendMailBtn({ email, initialCountdown }:any) {
    const [isSending, setIsSending] = useState(false);
    const [countdown, setCountdown] = useState(initialCountdown || 0);

    useEffect(() => {
        if (initialCountdown > 0) {
            // Initialize countdown with the remaining time fetched from the database
            setCountdown(initialCountdown);
        }
    }, [initialCountdown]);

    useEffect(() => {
        // Decrease countdown every second if it's greater than 0
        const timer = countdown > 0 && setInterval(() => setCountdown(countdown - 1), 1000);
        //@ts-ignore
        return () => clearInterval(timer); // Cleanup the interval on component unmount
    }, [countdown]);

    const handleSendEmail = async (e:any) => {
        e.preventDefault();
        setIsSending(true);

        try {
            const response = await sendEmail(email);
            if (response?.success) {
                setCountdown(60); // Start a 60-second countdown
            } else {
                alert('Failed to send verification email. Please try again.');
            }
        } catch (error) {
            console.error('Error sending verification email:', error);
            alert('An error occurred while sending the email.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSendEmail}>
                <input type="hidden" name="email" value={email} />
                <button 
                    className={`w-full text-white p-3 rounded-lg mt-4 ${countdown > 0 ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'}`} 
                    type='submit' 
                    disabled={isSending || countdown > 0}
                >
                    {countdown > 0 
                        ? `Изпрати отново след ${countdown} секунди` 
                        : (isSending ? 'Зареждане...' : 'Изпрати линк')
                    }
                </button>
            </form>
        </div>
    )
}

export default SendMailBtn;

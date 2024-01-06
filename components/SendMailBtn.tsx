"use client"
import { sendEmail } from '@/server/auth';
import React, { useState } from 'react'
// Assume sendEmail is an async function that returns { success: true } on success

function SendMailBtn({ email }:any) {
    // State to manage loading and sent status
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSendEmail = async (e:any) => {
        e.preventDefault(); // Prevent the form from reloading the page
        setIsSending(true); // Start the loading process

        try {
            const response = await sendEmail(email); // Send the email
            if (response?.success) {
                setIsSent(true); // Email sent successfully
            } else {
                // Handle the failure case
                alert('Failed to send verification email. Please try again.');
            }
        } catch (error) {
            // Handle any errors during the email sending process
            console.error('Error sending verification email:', error);
            alert('An error occurred while sending the email.');
        } finally {
            setIsSending(false); // End the loading process
        }
    };

    return (
        <div>
            <form onSubmit={handleSendEmail}>
                <input type="hidden" name="email" value={email} />
                <button 
                    className={`w-full text-white p-3 rounded-lg mt-4 ${isSent ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'}`} 
                    type='submit' 
                    disabled={isSending || isSent}
                >
                    {isSent ? 'Verification Mail Sent' : (isSending ? 'Loading...' : 'Send Verification Link')}
                </button>
            </form>
        </div>
    )
}

export default SendMailBtn

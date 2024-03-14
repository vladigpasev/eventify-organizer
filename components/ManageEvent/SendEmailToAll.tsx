//Copyright (C) 2024  Vladimir Pasev
'use client'
import React, { useState } from 'react';
import { checkAuthenticated } from '@/server/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

export const maxDuration = 300;

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import { sendMailToAllCustomers } from '@/server/events/tickets/sendMailToAll';

//@ts-ignore
function SendEmailToAll({ eventId, onCustomerAdded }) {
    const [isModalOpen, setModalOpen] = useState(false);

    const toggleModal = () => setModalOpen(!isModalOpen);

    return (
        <div>
            <button onClick={toggleModal} className='btn mb-5 mt-5'>Send Email To All Customers</button>

            {isModalOpen && (
                <Modal
                    toggleModal={toggleModal}
                    eventId={eventId}
                    onCustomerAdded={onCustomerAdded}
                />
            )}
        </div>
    );
}

//@ts-ignore
function Modal({ toggleModal, eventId, onCustomerAdded }) {
    const [isLoading, setIsLoading] = useState(false);
    const [emailText, setEmailText] = useState('');
    const router = useRouter();

    const handleQuillChange = (value:any) => {
        setEmailText(value);
    };
    //@ts-ignore
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setIsLoading(true); // Set loading state to true when submission starts

        const formData = {
            subject: event.target.subject.value,
            emailText: emailText,
            eventId: eventId,
        };

        console.log(formData);

        // Call the createManualTicket server action with formData
        try {
            const isAuthenticated = await checkAuthenticated(); // Check if the user is authenticated
            if (!isAuthenticated) {
                alert('Your session is expired. Please refresh the page to sign in again.');
                router.refresh;
                throw "Your session is expired. Please refresh the page to sign in again.";
            }
            await sendMailToAllCustomers(formData);
            toggleModal(); // Close modal on successful submission
            onCustomerAdded();
        } catch (error) {
            console.error('Failed to create manual ticket:', error);
        } finally {
            setIsLoading(false); // Reset loading state whether submission is successful or fails
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                <h2 className="text-xl mb-4 font-bold">Send Email To All Customers</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className='pb-5'>
                        <label htmlFor="subject" className='text-gray-500 font-semibold'>Subject:</label>
                        <input
                            id='subject'
                            type="text"
                            placeholder="Subject"
                            className="input border border-gray-200 w-full"
                            required
                        />
                    </div>
                    <label htmlFor="emailText" className='text-gray-500 font-semibold'>Email Text:</label>
                    <div className='text-[16pt]'>Здравей, (Име Фамилия),</div>
                    <ReactQuill
                            theme="snow"
                            value={emailText}
                            onChange={handleQuillChange}
                            placeholder="Напиши текст на имейл"
                            className='text-black'
                            id='emailText'
                        />
                    <p className='text-gray-400'>*Sending an email to so many customers may take a while, so please wait for the process to complete.</p>
                    
                    <button
                        type="submit"
                        className="btn bg-blue-500 text-white w-full"
                        disabled={isLoading} // Disable the button when loading
                    >
                        {isLoading ? 'Loading...' : 'Send Email'}
                    </button>
                </form>
                <button
                    onClick={toggleModal}
                    className="mt-4 text-gray-600 underline"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

export default SendEmailToAll;
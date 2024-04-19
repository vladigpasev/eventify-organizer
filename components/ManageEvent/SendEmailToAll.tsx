//Copyright (C) 2024  Vladimir Pasev
'use client'
import React, { useState } from 'react';
import { checkAuthenticated } from '@/server/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

export const maxDuration = 300;

const BATCH_SIZE = 100;

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import { sendMailToAllCustomers } from '@/server/events/tickets/sendMailToAll';

//@ts-ignore
function SendEmailToAll({ eventId, onCustomerAdded }) {
    const [isModalOpen, setModalOpen] = useState(false);

    const toggleModal = () => setModalOpen(!isModalOpen);

    return (
        <div>
            <button onClick={toggleModal} className='btn btn-wide mb-5 mt-5'>Изпрати имейл</button>

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
        event.preventDefault();
        setIsLoading(true);
    
        const formData = {
            subject: event.target.subject.value,
            emailText: emailText,
            eventId: eventId,
        };
    
        try {
            const isAuthenticated = await checkAuthenticated();
            if (!isAuthenticated) {
                alert('Сесията ви е изтекла. Моля, опреснете страницата, за да влезете отново.');
                router.refresh();
                return;
            }
    
            let start = 0;
            let hasMore = true;
    
            while (hasMore) {
                const response = await sendMailToAllCustomers(formData, start, BATCH_SIZE);
                hasMore = response.hasMore;
                start += BATCH_SIZE;
            }
    
            toggleModal(); // Close modal after all batches are sent
            onCustomerAdded();
        } catch (error) {
            console.error('Error during email sending:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                <h2 className="text-xl mb-4 font-bold">Изпрати имейл до всички гости</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className='pb-5'>
                        <label htmlFor="subject" className='text-gray-500 font-semibold'>Тема:</label>
                        <input
                            id='subject'
                            type="text"
                            placeholder="Subject"
                            className="input border border-gray-200 w-full"
                            required
                        />
                    </div>
                    <label htmlFor="emailText" className='text-gray-500 font-semibold'>Текст на имейла:</label>
                    <div className='text-[16pt]'>Здравей, (Име Фамилия),</div>
                    <ReactQuill
                            theme="snow"
                            value={emailText}
                            onChange={handleQuillChange}
                            placeholder="Напиши текст на имейл"
                            className='text-black'
                            id='emailText'
                        />
                    <p className='text-gray-400'>*Изпращането на имейл до толкова много клиенти може да отнеме известно време, затова изчакайте процеса да приключи.</p>
                    
                    <button
                        type="submit"
                        className="btn bg-blue-500 text-white w-full"
                        disabled={isLoading} // Disable the button when loading
                    >
                        {isLoading ? 'Зареждане...' : 'Изпрати имейл'}
                    </button>
                </form>
                <button
                    onClick={toggleModal}
                    className="mt-4 text-gray-600 underline"
                >
                    Затвори
                </button>
            </div>
        </div>
    );
}

export default SendEmailToAll;
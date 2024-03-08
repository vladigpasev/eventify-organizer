//Copyright (C) 2024  Vladimir Pasev
"use client"

import React, { useState } from 'react';
import { createManualTicket } from '@/server/events/tickets/generate';
import { checkAuthenticated } from '@/server/auth';
import { useRouter } from 'next/navigation';

//@ts-ignore
function AddCustomer({ eventId, onCustomerAdded }) {
    const router = useRouter();

    // State to control modal visibility
    const [isModalOpen, setModalOpen] = useState(false);

    // Function to toggle modal visibility
    const toggleModal = async () => {
        const isAuthenticated = await checkAuthenticated(); // Check if the user is authenticated
        if (isAuthenticated) {
            setModalOpen(!isModalOpen); // If authenticated, toggle the modal
        } else {
            router.refresh(); // If not authenticated, reload the page
            alert('Your session is expired. Please refresh the page to sign in again.')
        }
    };


    return (
        <div>
            <div onClick={toggleModal} className='text-gray-600 flex flex-row justify-center items-center btn'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={20} fill='currentColor'><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" fill='currentColor' /></svg><div> Add ticket</div></div>
            {isModalOpen && <Modal toggleModal={toggleModal} eventId={eventId} onCustomerAdded={onCustomerAdded} />}
        </div>
    );
}
//@ts-ignore
function Modal({ toggleModal, eventId, onCustomerAdded }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    //@ts-ignore
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setIsLoading(true); // Set loading state to true when submission starts

        const formData = {
            firstname: event.target.name.value,
            lastname: event.target.surname.value,
            email: event.target.email.value,
            guestsCount: event.target.guests_count.value,
            eventUuid: eventId
        };

        // Call the createManualTicket server action with formData
        try {
            const isAuthenticated = await checkAuthenticated(); // Check if the user is authenticated
            if (!isAuthenticated) {
                alert('Your session is expired. Please refresh the page to sign in again.');
                router.refresh;
                throw "Your session is expired. Please refresh the page to sign in again.";
            }
            await createManualTicket(formData);
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
                <h2 className="text-xl mb-4 font-bold">Add Customer</h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className='text-gray-500 font-semibold'>Name:</label>
                            <input
                                id='name'
                                type="text"
                                placeholder="Name"
                                className="input border border-gray-200 w-full"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="surname" className='text-gray-500 font-semibold'>Surname:</label>
                            <input
                                id='surname'
                                type="text"
                                placeholder="Surname"
                                className="input border border-gray-200 w-full"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className='text-gray-500 font-semibold'>Email (for tickets):</label>
                        <input
                            id='email'
                            type="email"
                            placeholder="Email"
                            className="input border border-gray-200 w-full"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className='text-gray-500 font-semibold'>Guests Count (group):</label>
                        <input
                            id='guests_count'
                            type="number"
                            placeholder="Guests Count"
                            className="input border border-gray-200 w-full"
                            defaultValue={1}
                            min={1}
                            required
                        />
                    </div>
                    <div className='flex items-start gap-2'>
                        <input type="checkbox" id='declare' value="declare" className='checkbox' required />
                        <label htmlFor="declare" className='text-gray-600 text-base cursor-pointer'>I am informed that by adding customers manually, the user will receive tickets to their email and I should proceed the payment on my own.</label>
                    </div>
                    <button
                        type="submit"
                        className="btn bg-blue-500 text-white w-full"
                        disabled={isLoading} // Disable the button when loading
                    >
                        {isLoading ? 'Loading...' : 'Add user'}
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

export default AddCustomer;

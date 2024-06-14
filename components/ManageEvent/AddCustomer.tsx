"use client"

import React, { useState } from 'react';
import { createManualTicket } from '@/server/events/tickets/generate';
import { checkAuthenticated } from '@/server/auth';
import { checkPaperToken } from '@/server/events/tickets/check_paper';
import { useRouter } from 'next/navigation';
import { QrScanner } from '@yudiel/react-qr-scanner';

//@ts-ignore
function AddCustomer({ eventId, onCustomerAdded, userUuid }) {
    const router = useRouter();
    const [isModalOpen, setModalOpen] = useState(false);
    const [paperTicketAccessToken, setPaperTicketAccessToken] = useState(null);
    const [nineDigitCode, setNineDigitCode] = useState(null);
    const [isQrScannerOpen, setQrScannerOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const toggleModal = async () => {
        const isAuthenticated = await checkAuthenticated();
        if (isAuthenticated) {
            if (isModalOpen) {
                setPaperTicketAccessToken(null); // Clear paper ticket token when closing the modal
                setNineDigitCode(null); // Clear nineDigitCode when closing the modal
                setErrorMessage(''); // Clear error message when closing the modal
            }
            setModalOpen(!isModalOpen);
        } else {
            router.refresh();
            alert('Your session is expired. Please refresh the page to sign in again.')
        }
    };

    //@ts-ignore
    const handleQrScan = async (result) => {
        if (result) {
            try {
                const response = await checkPaperToken({ eventUuid: eventId, token: result });
                if (response.success) {
                    setPaperTicketAccessToken(result);
                    //@ts-ignore
                    setNineDigitCode(response.currentCustomer.nineDigitCode); // Set nineDigitCode
                    setQrScannerOpen(false);
                    setErrorMessage('');
                } else {
                    setErrorMessage('Хартиеният билет е невалиден');
                    setQrScannerOpen(false);
                }
            } catch (error) {
                console.error('Error during paper ticket verification:', error);
                setErrorMessage('Грешка при верификация на хартиения билет');
                setQrScannerOpen(false);
            }
        }
    };

    //@ts-ignore
    const handleQrError = (error) => {
        console.error('Error during QR Code scan:', error);
        setQrScannerOpen(false);
    };

    const handleDeletePaperTicket = () => {
        setPaperTicketAccessToken(null);
        setNineDigitCode(null); // Clear nineDigitCode when deleting the paper ticket
        setErrorMessage('');
    };

    return (
        <div>
            <div onClick={toggleModal} className='text-gray-600 flex flex-row justify-center items-center btn'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={20} fill='currentColor'>
                    <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" fill='currentColor' />
                </svg>
                <div> Създай билет</div>
            </div>
            {isModalOpen && (
                <Modal
                    toggleModal={toggleModal}
                    eventId={eventId}
                    onCustomerAdded={onCustomerAdded}
                    paperTicketAccessToken={paperTicketAccessToken}
                    nineDigitCode={nineDigitCode} // Pass nineDigitCode to Modal
                    setQrScannerOpen={setQrScannerOpen}
                    handleDeletePaperTicket={handleDeletePaperTicket}
                    errorMessage={errorMessage}
                    setPaperTicketAccessToken={setPaperTicketAccessToken}
                    userUuid={userUuid}
                />
            )}
            {isQrScannerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
                    <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                        <QrScanner
                            onDecode={handleQrScan}
                            onError={handleQrError}
                        />
                        <button onClick={() => setQrScannerOpen(false)} className="btn mt-4">Откажи сканиране</button>
                    </div>
                </div>
            )}
        </div>
    );
}

//@ts-ignore
function Modal({ toggleModal, eventId, onCustomerAdded, paperTicketAccessToken, nineDigitCode, setQrScannerOpen, handleDeletePaperTicket, errorMessage, setPaperTicketAccessToken, userUuid }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const router = useRouter();
    
    //@ts-ignore
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setFormError('');

        const formData = {
            firstname: event.target.name.value,
            lastname: event.target.surname.value,
            email: event.target.email.value,
            guestsCount: event.target.guests_count.value,
            eventUuid: eventId,
            paperTicketAccessToken: paperTicketAccessToken,
            sellerUuid: userUuid,
            reservation: event.target.reservation.checked,
        };

        try {
            const isAuthenticated = await checkAuthenticated();
            if (!isAuthenticated) {
                alert('Сесията ти е изтекла. Моля презареди страницата, за да влезеш в акаунта си отново.');
                router.refresh();
                throw "Сесията ти е изтекла. Моля презареди страницата, за да влезеш в акаунта си отново.";
            }
            const response = await createManualTicket(formData);
            if (!response.success) {
                setFormError(response.message);
                throw new Error(response.message);
            }
            setPaperTicketAccessToken(null); // Clear the paper ticket token on successful submission
            toggleModal();
            onCustomerAdded();
        } catch (error) {
            console.error('Failed to create manual ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                <h2 className="text-xl mb-4 font-bold">Създай билет</h2>
                {formError && (
                    <div className="text-red-500 mb-2">
                        {formError}
                    </div>
                )}
                {errorMessage && (
                    <div className="text-red-500 mb-2">
                        {errorMessage}
                    </div>
                )}
                {paperTicketAccessToken ? (
                    <div className='flex flex-row gap-2 mb-5'>
                        <p>Хартиен билет <strong>#{nineDigitCode}</strong></p>
                        <button onClick={handleDeletePaperTicket} className="link text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={10} fill='red'><path d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"/></svg></button>
                    </div>
                ) : (
                    <button onClick={() => setQrScannerOpen(true)} className='btn btn-primary mb-2'>Добави хартиен билет</button>
                )}
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className='text-gray-500 font-semibold'>Име:</label>
                            <input
                                id='name'
                                type="text"
                                placeholder="Име"
                                className="input border border-gray-200 w-full"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="surname" className='text-gray-500 font-semibold'>Фамилия:</label>
                            <input
                                id='surname'
                                type="text"
                                placeholder="Фамилия"
                                className="input border border-gray-200 w-full"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className='text-gray-500 font-semibold'>Имейл (на който ще се изпрати билетът):</label>
                        <input
                            id='email'
                            type="email"
                            placeholder="Имейл"
                            className="input border border-gray-200 w-full"
                            required
                        />
                    </div>
                    <input
                        id='guests_count'
                        type="hidden"
                        placeholder="Guests Count"
                        defaultValue={1}
                        min={1}
                        required
                    />
                     <div className='flex items-start gap-2'>
                        <input type="checkbox" id='reservation' value="reservation" className='checkbox' />
                        <label htmlFor="reservation" className='text-gray-600 text-base cursor-pointer'>Резервация (не съм получил плащане)</label>
                    </div>
                    <button
                        type="submit"
                        className="btn bg-blue-500 text-white w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Зареждане...' : 'Създай билет'}
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

export default AddCustomer;

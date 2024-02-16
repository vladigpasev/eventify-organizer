'use client'
import React, { useState, useEffect } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { checkTicket, markAsEntered, markAsExited } from '@/server/events/tickets/check';

//@ts-ignore
function CheckTicket({ eventId }) {
    const [isModalOpen, setModalOpen] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const toggleModal = () => setModalOpen(!isModalOpen);

    return (
        <div>
            <button onClick={toggleModal} className='btn'><svg width={34} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M5.75 13.75v4.5h4.5v-4.5h-4.5Z"></path><path fill="currentColor" d="M17 17h2v2h-2Z"></path><path fill="currentColor" d="M13 13h2v2h-2Z"></path><path fill="currentColor" d="M15 15h2v2h-2Z"></path><path fill="currentColor" d="M13 17h2v2h-2Z"></path><path fill="none" stroke="currentColor" stroke-width="1.5" d="M18.25 5.75v4.5h-4.5v-4.5h4.5Z"></path><path fill="none" stroke="currentColor" stroke-width="1.5" d="M5.75 5.75v4.5h4.5v-4.5h-4.5Z"></path></svg>Scan Ticket </button>

            {isModalOpen && (
                <Modal
                    toggleModal={toggleModal}
                    eventId={eventId}
                    scanResult={scanResult}
                    setScanResult={setScanResult}
                    ticketTokenProp={null}
                />
            )}
        </div>
    );
}

//@ts-ignore
export function Modal({ toggleModal, eventId, scanResult, setScanResult, ticketTokenProp }) {
    const [ticketToken, setTicketToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    //@ts-ignore
    const handleDecode = async (result) => {
        if (result) {
            try {
                const response = await checkTicket({ qrData: result, eventUuid: eventId });
                setTicketToken(result);
                setScanResult(response); // Display the result
            } catch (error) {
                console.error('Error processing QR code:', error);
                // Handle error here
            }
        }
    };
    //@ts-ignore
    const handleError = (error) => {
        console.error('Error during QR Code scan:', error);
        // Handle QR scanner error here
    };

    const handleMarkAsEntered = async () => {
        const data = {
            ticketToken: ticketToken,
            eventUuid: eventId
        };

        try {
            await markAsEntered(data);
            setScanResult(null);
            // Handle successful marking here, maybe show a confirmation message
        } catch (error) {
            console.error('Error marking ticket as entered:', error);
            // Handle error here
        }

    };

    useEffect(() => {
        const checkTicketWithToken = async () => {
            if (ticketTokenProp) {
                try {
                    const response = await checkTicket({ qrData: ticketTokenProp, eventUuid: eventId });
                    setTicketToken(ticketTokenProp);
                    setScanResult(response); // Display the result
                } catch (error) {
                    console.error('Error processing ticket token:', error);
                    // Handle error here
                }
            }
            setIsLoading(false); // Set loading to false after processing
        };

        checkTicketWithToken();
    }, [ticketTokenProp, eventId, setScanResult]);





    const ResultScreen = () => {
        if (scanResult?.success) {
            const { currentCustomer } = scanResult;

            const handleExit = async () => {
                const data = {
                    ticketToken: ticketToken,
                    eventUuid: eventId
                };

                try {
                    await markAsExited(data);
                    setScanResult(null);
                    // Handle successful marking here, maybe show a confirmation message
                } catch (error) {
                    console.error('Error marking ticket as exited:', error);
                    // Handle error here
                }
            };
            return (
                <div className="text-center p-4">
                    {currentCustomer.isEntered ? (
                        <div>
                            <div className="text-yellow-500">
                                <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                                <p className="text-xl font-bold">User is Already in the Event</p>
                            </div>
                            <UserInfo currentCustomer={currentCustomer} />
                            <div className='flex'>
                                <button onClick={handleExit} className="btn bg-yellow-500 text-white mt-4 w-full">
                                    Mark as Exited
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="text-green-500">
                                <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                <p className="text-xl font-bold">Ticket is Valid</p>
                            </div>
                            <UserInfo currentCustomer={currentCustomer} />
                            <div className='flex'>
                                <button onClick={handleMarkAsEntered} className="btn bg-green-500 text-white mt-4 w-full">
                                    Mark as Entered
                                </button>
                            </div>
                        </div>
                    )}
                    <div className='flex flex-col justify-center gap-5'>
                        <button onClick={() => { setScanResult(null); }} className="btn btn-secondary mt-4">
                            Scan Another One
                        </button>
                        <button onClick={() => { setScanResult(null); toggleModal(); }} className="link mt-4">
                            Close
                        </button>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="text-center p-4">
                    <div className="text-red-500">
                        <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        <p className="text-xl font-bold">Ticket is Not Valid</p>
                    </div>
                    <button onClick={() => { setScanResult(null) }} className="btn bg-red-500 text-white mt-4">
                        Scan Another One
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                {isLoading ? (
                    <div>Loading...</div> // Show loading indicator
                ) : !scanResult ? (
                    <>
                        <QrScanner
                            onDecode={handleDecode}
                            onError={handleError}
                        // You can add styles or other properties here
                        />
                        <button onClick={toggleModal} className="btn mt-4">Cancel Scan</button>
                    </>
                ) : <ResultScreen />}
            </div>
        </div>
    );
}

//@ts-ignore 
const UserInfo = ({ currentCustomer }) => (
    <div className="mt-4 text-left">
        <p><strong>Name:</strong> {currentCustomer.firstName} {currentCustomer.lastName}</p>
        <p><strong>Email:</strong> {currentCustomer.email}</p>
        <p><strong>Guest Count:</strong> {currentCustomer.guestCount}</p>
    </div>
);


export default CheckTicket;
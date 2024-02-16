'use client'
import React, { useState } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { checkTicket, markAsEntered, markAsExited } from '@/server/events/tickets/check';
import { Modal } from './CheckTickets';

//@ts-ignore
function TicketActionsBtn({ eventId, ticketToken }) {
    const [isModalOpen, setModalOpen] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const toggleModal = () => setModalOpen(!isModalOpen);

    return (
        <div>
            
            <button onClick={toggleModal} className="btn btn-ghost btn-xs bg-blue-500 text-white">actions</button>
            {isModalOpen && (
                <Modal
                    toggleModal={toggleModal}
                    eventId={eventId}
                    scanResult={scanResult}
                    setScanResult={setScanResult}
                    ticketTokenProp={ticketToken}
                />
            )}
        </div>
    );
}



export default TicketActionsBtn;
//Copyright (C) 2024  Vladimir Pasev
'use client'
import React, { useState } from 'react';
import { Modal } from './CheckTickets';

//@ts-ignore
function TicketActionsBtn({ eventId, ticketToken, onEnteredOrExited }) {
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
                    onEnteredOrExited={onEnteredOrExited}
                />
            )}
        </div>
    );
}



export default TicketActionsBtn;
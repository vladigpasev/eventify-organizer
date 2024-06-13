"use client"
import React, { useState } from 'react';
import { deactivateManualTicket } from '@/server/events/tickets/generate';
//@ts-ignore
function TicketDeactivateBtn({ customerUuid, disabled }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeactivated, setIsDeactivated] = useState(false);

    const deactivateTicket = async () => {
        try {
            setIsLoading(true);
            await deactivateManualTicket(customerUuid);
            setIsDeactivated(true); // On success, mark as deactivated
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to deactivate ticket:', error);
            setIsLoading(false);
        }
    };

    return (
        <div>
            {disabled ? (
                <button className={`btn btn-ghost btn-xs bg-red-500 text-white`} disabled>
                    Нямате достъп
                </button>
            ) : (
                <button 
                    className={`btn btn-ghost btn-xs ${isDeactivated ? '' : 'bg-red-500'} text-white`}
                    onClick={!isDeactivated && !isLoading ? deactivateTicket : undefined}
                    disabled={isLoading || isDeactivated || disabled}
                >
                    {isLoading ? 'Деактивиране...' : isDeactivated ? 'Деактивиран' : 'Деактивирай'}
                </button>
            )}
        </div>
    );
}

export default TicketDeactivateBtn;
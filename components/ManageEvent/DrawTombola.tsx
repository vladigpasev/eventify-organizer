"use client";
import React, { useState } from 'react';
import { drawWinners, approveWinners } from '@/server/events/tomboladraw';
//@ts-ignore
function DrawTombola({ eventId, isSeller, userUuid }) {
    const [isOverlayVisible, setOverlayVisible] = useState(false);
    const [winners, setWinners] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDrawWinnersClick = async () => {
        setOverlayVisible(true);
        setIsLoading(true);

        try {
            const response = await drawWinners({ eventUuid: eventId });
            if (response.success) {
                //@ts-ignore
                setWinners(response.winners);
            } else {
                setError(response.message);
            }
        } catch (err) {
            //@ts-ignore
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveWinners = async () => {
        setIsLoading(true);

        try {
            const response = await approveWinners({ eventUuid: eventId, winners });
            if (response.success) {
                setOverlayVisible(false);
                setWinners([]);
            } else {
                setError(response.message);
            }
        } catch (err) {
            //@ts-ignore
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectWinners = () => {
        setOverlayVisible(false);
        setWinners([]);
    };

    return (
        <div className="text-center">
            <button onClick={handleDrawWinnersClick} className="btn btn-primary text-2xl py-4 px-8 mt-8">
                Изтегли победители
            </button>
            {isOverlayVisible && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center animate-pulse">
                            <div className="loader mb-4"></div>
                            <p className="text-white text-2xl font-semibold">Зареждане...</p>
                        </div>
                    ) : error ? (
                        <p className="text-red-500 text-2xl font-semibold">{error}</p>
                    ) : (
                        <>
                            <h2 className="text-4xl font-bold text-white mb-8">Победители</h2>
                            <ul className="mb-8 text-white text-2xl">
                                {winners.map((winner, index) => (
                                    <li key={index} className="mb-2">
                                        {/* @ts-ignore */}
                                        <span className="font-bold">{winner.itemName}</span>: {winner.winnerName}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-4">
                                <button onClick={handleApproveWinners} className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 text-xl rounded">
                                    Одобри победители
                                </button>
                                <button onClick={handleRejectWinners} className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 text-xl rounded">
                                    Отказ
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default DrawTombola;

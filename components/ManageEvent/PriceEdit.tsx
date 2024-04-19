//Copyright (C) 2024  Vladimir Pasev
"use client"
import React, { useState, useEffect } from 'react';
import { editPrice } from '@/server/events/edit';
//@ts-ignore
const EventPriceEditor = ({ initialPrice, eventId, isFree }) => {
    const [price, setPrice] = useState(initialPrice);
    const [isPriceChanged, setIsPriceChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isFreeEvent, setIsFreeEvent] = useState(isFree || false);

    useEffect(() => {
        setIsPriceChanged(price !== initialPrice || isFree !== isFreeEvent);
    }, [price, initialPrice, isFree, isFreeEvent]);
    //@ts-ignore
    const handlePriceChange = (e) => {
        if (e.target.value.length <= 20) {
            setPrice(e.target.value);
            setError("");
        }
    };

    const handleSave = async () => {
        if (!isPriceChanged) return;

        setIsLoading(true);
        try {
            const response = await editPrice({ uuid: eventId, price: isFreeEvent ? 0 : price });
            if (response.success) {
                setIsPriceChanged(false);
            } else {
                setError("Failed to save changes");
            }
        } catch (error) {
            setError("An error occurred while saving changes");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>}
            <label htmlFor="" className='text-gray-500 font-semibold'>Цена*</label>
            <div className=''>
                <div className="mb-4">
                    {/* Free event selector */}
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Това събитие безплатно ли е?
                    </label>
                    <select
                        id="isFree"
                        value={isFreeEvent ? "true" : "false"}
                        onChange={(e) => setIsFreeEvent(e.target.value === "true")}
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                    >
                        <option value="true">Да</option>
                        <option value="false">Не</option>
                    </select>
                </div>
                {!isFreeEvent && (
                    <div className="mb-4">
                        <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
                            Цена (лв.)
                        </label>
                        <input
                            id="price"
                            type="number"
                            value={price}
                            onChange={handlePriceChange}
                            className="focus:input focus:input-bordered w-full border-b-2"
                            placeholder="Enter event price"
                            min="0"
                            step="0.01"
                        />
                    </div>
                )}
            </div>
            <button
                className="btn btn-primary mb-10"
                onClick={handleSave}
                type='submit'
                disabled={!isPriceChanged || isLoading}
            >
                {isLoading ? 'Зареждане...' : 'Редактирай цена'}
            </button>
        </div>
    );
};

export default EventPriceEditor;

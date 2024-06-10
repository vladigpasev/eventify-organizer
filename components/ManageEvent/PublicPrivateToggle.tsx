//Copyright (C) 2024  Vladimir Pasev
"use client";
import React, { useState } from 'react';
import { changeVisibility } from '@/server/events/edit';

//@ts-ignore
const PublicPrivateToggle = ({ initialVisibility, eventId, isSeller }) => {
    if(isSeller){
        return (
            <div>
                <label htmlFor="visibilityToggle" className='text-gray-500 font-semibold'>Тип събитите</label>
                <select
                    id="visibilityToggle"
                    value={initialVisibility}
                    className="input input-bordered w-full border-b-2 p-2 my-3"
                    disabled
                >
                    <option value="public">Публично</option>
                    <option value="private">Частно</option>
                </select>
            </div>
        );
    }
    const [visibility, setVisibility] = useState(initialVisibility);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    //@ts-ignore
    const handleVisibilityChange = async (event) => {
        const newVisibility = event.target.value;
        setVisibility(newVisibility);
        setIsLoading(true);

        try {
           // console.log("CLIENT: Changing visibility to " + newVisibility);
            const response = await changeVisibility({ uuid: eventId, visibility: newVisibility });

            if (!response.success) {
                setError("Failed to change visibility");
            }
            // Handle other cases of the response, if necessary
        } catch (error) {
            setError("Failed to change visibility");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>}
            <label htmlFor="visibilityToggle" className='text-gray-500 font-semibold'>Тип събитите</label>
            <select
                id="visibilityToggle"
                value={visibility}
                onChange={handleVisibilityChange}
                className="input input-bordered w-full border-b-2 p-2 my-3"
                disabled={isLoading}
            >
                <option value="public">Публично</option>
                <option value="private">Частно</option>
            </select>
            {isLoading && <p>Зареждане...</p>}
        </div>
    );
};

export default PublicPrivateToggle;
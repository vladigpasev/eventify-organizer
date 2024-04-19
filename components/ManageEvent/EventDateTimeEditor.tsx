//Copyright (C) 2024  Vladimir Pasev
"use client"
import React, { useState, useEffect } from 'react';
import { editDateTime } from '@/server/events/edit';

//@ts-ignore
const EventDateTimeEditor = ({ initialDateTime, eventId }) => {
    const [dateTime, setDateTime] = useState(initialDateTime);
    const [isDateTimeChanged, setIsDateTimeChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(""); // New state for error message

    useEffect(() => {
        setIsDateTimeChanged(dateTime !== initialDateTime);
    }, [dateTime, initialDateTime]);
    //@ts-ignore
    const handleDateTimeChange = (e) => {
        if (e.target.value.length <= 20) {
            setDateTime(e.target.value);
            setError("")
        }
    };

    const handleSaveTitle = async () => {
        if (!isDateTimeChanged) return;


        setIsLoading(true);
        try {
            const response = await editDateTime({ uuid: eventId, dateTime });
            if (response.success) {
                setIsDateTimeChanged(false);
            } else {
                setError("Failed to save date and time"); // Set an error message if not successful
            }
        } catch (error) {
            setError("An error occurred while saving the title"); // Set an error message on catch
        } finally {
            setIsLoading(false);
        }
    };
    const minDateTime = new Date().toISOString().slice(0, 16);
    return (
        <div>
            {error && <p className="text-red-500">{error}</p>}
            <label htmlFor="editDateTime" className='text-gray-500 font-semibold'>Дата и час*</label>
            <p className="text-base font-semibold mb-4">
                <input
                    id='editDateTime'
                    type="datetime-local"
                    //@ts-ignore
                    value={dateTime}
                    onChange={handleDateTimeChange}
                    min={minDateTime}
                    className="focus:input focus:input-bordered w-full border-b-2"
                    placeholder="Date and Time"
                />
            </p>
            <button
                className="btn btn-primary mb-10"
                onClick={handleSaveTitle}
                type='submit'
                disabled={!isDateTimeChanged || isLoading}
            >
                {isLoading ? 'Зареждане...' : 'Редактирай дата и час'}
            </button>
        </div>
    );
};

export default EventDateTimeEditor;

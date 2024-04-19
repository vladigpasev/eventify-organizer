//Copyright (C) 2024  Vladimir Pasev
"use client"
import React, { useState, useEffect } from 'react';
import { editTitle } from '@/server/events/edit';

//@ts-ignore
const EventTitleEditor = ({ initialTitle, eventId }) => {
    const [title, setTitle] = useState(initialTitle);
    const [isTitleChanged, setIsTitleChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(""); // New state for error message

    useEffect(() => {
        setIsTitleChanged(title !== initialTitle);
    }, [title, initialTitle]);
    //@ts-ignore
    const handleTitleChange = (e) => {
        if (e.target.value.length <= 20) {
            setTitle(e.target.value);
            setError("")
        }
    };

    const handleSaveTitle = async () => {
        if (title.length < 3) {
            setError("Заглавието трябва да бъде по-дълго от 3 символа!");
        };
        if (!isTitleChanged || title.length < 3) return;


        setIsLoading(true);
        try {
            const response = await editTitle({ uuid: eventId, title });
            if (response.success) {
                setIsTitleChanged(false);
            } else {
                setError("Failed to save title"); // Set an error message if not successful
            }
        } catch (error) {
            setError("An error occurred while saving the title"); // Set an error message on catch
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>} 
            <h1 className="text-2xl font-bold mb-4 text-black">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    className='focus:input focus:input-bordered w-full border-b-2'
                    required
                    minLength={3}
                    maxLength={20} // Set the maximum length of the input
                />
            </h1>
            <p className='text-gray-400'>
                {title.length}/20 символа
            </p>
            <button
                className="btn btn-primary mb-10"
                onClick={handleSaveTitle}
                type='submit'
                disabled={!isTitleChanged || isLoading}
            >
                {isLoading ? 'Зареждане...' : 'Запази заглавие'}
            </button>
        </div>
    );
};

export default EventTitleEditor;

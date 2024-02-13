"use client"
import React, { useState, useEffect, useRef } from 'react';
import { editDescription } from '@/server/events/edit';
//@ts-ignore
const EventDescriptionEditor = ({ initialDescription, eventId }) => {
    const [description, setDescription] = useState(initialDescription);
    const [isDescriptionChanged, setIsDescriptionChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef(null); // Reference to the textarea
    const [error, setError] = useState("");

    useEffect(() => {
        setIsDescriptionChanged(description !== initialDescription);
        adjustTextareaHeight();
    }, [description, initialDescription]);

    // Adjust the height of the textarea to fit its content
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            //@ts-ignore
            textarea.style.height = 'auto'; // Reset the height
            //@ts-ignore
            textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight
        }
    };
    //@ts-ignore
    const handleDescriptionChange = (e) => {
        if (e.target.value.length <= 1000) {
            setDescription(e.target.value);
            setError("")
        }
    };

    const handleSaveDescription = async () => {
        if (description.length < 20) {
            setError("Description must be more than 20 characters!");
        };
        if (!isDescriptionChanged || description.length < 20) return;
        setIsLoading(true); // Start loading
        try {
            console.log("CLIENT: " + JSON.stringify({ uuid: eventId, description }));
            const response = await editDescription({ uuid: eventId, description });

            if (response.success) {
                setIsDescriptionChanged(false);
                // Handle additional success response, e.g., show a success message
            } else {
                setError("Failed to save title");
            }
            // Handle other cases of the response, if necessary
        } catch (error) {
            // Handle error, e.g., show an error message
            setError("Failed to save title");
        } finally {
            setIsLoading(false); // Stop loading regardless of the outcome
        }
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>} 
            <label htmlFor="editdescr" className='text-gray-500 font-semibold'>Description</label>
            <p className="text-base font-normal mb-4 h-fit mt-2">
                <textarea
                    id='editdescr'
                    ref={textareaRef} // Attach the ref to the textarea
                    value={description}
                    onChange={handleDescriptionChange}
                    className='input input-bordered w-full border-b-2 h-5 p-5'
                    maxLength={1000}
                />
            </p>
            <p className='text-gray-400'>
                {description.length}/1000 characters
            </p>
            <button
                className="btn btn-primary mb-10"
                onClick={handleSaveDescription}
                disabled={!isDescriptionChanged || isLoading}
            >
                {isLoading ? 'Loading...' : 'Edit description'}
            </button>
        </div>
    );
};

export default EventDescriptionEditor;

"use client"
import React from 'react';

interface EventModalProps {
    onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-lg relative max-h-[80vh] overflow-y-auto">
                <button
                    className="absolute top-3 right-3 text-gray-700 text-lg font-semibold"
                    onClick={onClose}
                >
                    ×
                </button>
                <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
                {/* Form content goes here */}
                <form>
                    {/* Add form fields */}
                </form>
            </div>
        </div>
    );
};

export default EventModal;

"use client"
import React from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const EventModal = ({ onClose }:any) => {
    return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-lg relative w-1/2">
                    <button
                        className="absolute top-3 right-3 text-gray-700 text-lg font-semibold"
                        onClick={onClose}
                    >
                        ×
                    </button>
                    <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
                    <form action="/api/create-event">
                        <div className="mb-4">
                            <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">
                                Location
                            </label>
                            <Autocomplete >
                                <input
                                    id="location"
                                    type="text"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </Autocomplete>
                        </div>
                        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Create Event
                        </button>
                    </form>
                </div>
            </div>
    );
};

export default EventModal;
"use client"
import React, { useState, useEffect } from 'react';
import { editLocation } from '@/server/events/edit';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

//@ts-ignore
const LocationChanger = ({ initialLocation, eventId }) => {
    const [location, setLocation] = useState(initialLocation);
    const [isLocationChanged, setIsLocationChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(""); // New state for error message

    useEffect(() => {
        setIsLocationChanged(location !== initialLocation);
    }, [location, initialLocation]);
    //@ts-ignore
    const handleLocationChange = (e) => {
            setLocation(e.target.value);
            setError("")
    };

    const handleSaveLocation = async () => {
        if (!isLocationChanged) return;


        setIsLoading(true);
        try {
            const response = await editLocation({ uuid: eventId, location });
            if (response.success) {
                setIsLocationChanged(false);
            } else {
                setError("Failed to save location"); // Set an error message if not successful
            }
        } catch (error) {
            setError("An error occurred while saving the location"); // Set an error message on catch
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <LoadScript
            //@ts-ignore
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            libraries={["places"]}
        >
            <div>
                {error && <p className="text-red-500">{error}</p>}
                <label htmlFor="editLocation" className='text-gray-500 font-semibold'>Location*</label>
                <p className="text-base font-semibold mb-4">
                    <Autocomplete
                    
                    >
                        <input
                            id='editLocation'
                            type="text"
                            //@ts-ignore
                            value={location}
                            onChange={handleLocationChange}
                            className="focus:input focus:input-bordered w-full border-b-2"
                            placeholder="Location"
                        />
                    </Autocomplete>
                </p>
                <button
                    className="btn btn-primary mb-10"
                    onClick={handleSaveLocation}
                    type='submit'
                    disabled={!isLocationChanged || isLoading}
                >
                    {isLoading ? 'Loading...' : 'Edit location'}
                </button>
            </div>
        </LoadScript>
    );
};

export default LocationChanger;

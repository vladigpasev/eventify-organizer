"use client"
import React, { useState, useEffect, useRef } from 'react';
import { editLocation } from '@/server/events/edit';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
//@ts-ignore
const LocationChanger = ({ initialLocation, eventId }) => {
    const [isLocationChanged, setIsLocationChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const autocompleteRef = useRef(null);
    const formRef = useRef(null);

    const handleInputChange = (e: any) => {
        setIsLocationChanged(initialLocation !== e.target.value);
    };

    const handleAutocomplete = () => {
        if (autocompleteRef.current) {
            //@ts-ignore
            const place = autocompleteRef.current.getPlace();
            if (place && place.formatted_address) {
                setIsLocationChanged(initialLocation !== place.formatted_address);
                //@ts-ignore
                formRef.current['editLocation'].value = place.formatted_address;
            }
        }
    };
    //@ts-ignore
    const handleSubmit = async (e) => {
        e.preventDefault();
        //@ts-ignore
        const newLocation = formRef.current['editLocation'].value;
        if (initialLocation === newLocation) return;

        setIsLoading(true);
        try {
            const response = await editLocation({ uuid: eventId, location: newLocation });
            if (response.success) {
                setIsLocationChanged(false);
            } else {
                setError("Failed to save location");
            }
        } catch (error) {
            setError("An error occurred while saving the location");
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
            <form ref={formRef} onSubmit={handleSubmit}>
                <div>
                    {error && <p className="text-red-500">{error}</p>}
                    <label htmlFor="editLocation" className='text-gray-500 font-semibold'>Location*</label>
                    <p className="text-base font-semibold mb-4">
                        <Autocomplete
                            ref={autocompleteRef}
                            onPlaceChanged={handleAutocomplete}
                        >
                            <input
                                id='editLocation'
                                type="text"
                                defaultValue={initialLocation}
                                onChange={handleInputChange}
                                className="focus:input focus:input-bordered w-full border-b-2"
                                placeholder="Location"
                                autoComplete="on"
                            />
                        </Autocomplete>
                    </p>
                    <button
                        className="btn btn-primary mb-10"
                        type='submit'
                        disabled={!isLocationChanged || isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Edit location'}
                    </button>
                </div>
            </form>
        </LoadScript>
    );
};

export default LocationChanger;

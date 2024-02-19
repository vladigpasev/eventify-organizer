//Copyright (C) 2024  Vladimir Pasev
import EventForm from '@/components/EventForm';
import React from 'react';

//Setting max duration to prevent timeout during the connection with open AI
export const maxDuration = 300;

const CreateEvent: React.FC = () => {
    return (
        <div>
            <EventForm type='create' />
        </div>
    );
};

export default CreateEvent;

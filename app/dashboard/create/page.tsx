
import EventForm from '@/components/EventForm';
import React from 'react';

export const maxDuration = 300;

const CreateEvent: React.FC = () => {
    return (
        <div>
            <EventForm type='create' />
        </div>
    );
};

export default CreateEvent;

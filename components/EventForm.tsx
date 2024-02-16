"use client";
import React, { useState } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import { UploadButton } from "@/utils/uploadthing";
import { createEvent } from '@/server/events/create';

interface Field {
    id: string;
    label: string;
    placeholder: string;
    type: string;
    options?: string[];
    isTextArea?: boolean;
}

interface FieldGroup {
    title: string;
    fields: Field[];
}

interface EventFormData {
    eventName?: string;
    category?: string;
    description?: string;
    thumbnailUrl?: string;
    location?: string;
    isFree?: boolean;
    visibility?: string;
    price?: number;
    dateTime?: string;
}

interface EventFormProps {
    initialData?: EventFormData;
    type: 'create' | 'edit';
}

const EVENT_FIELD_GROUPS: FieldGroup[] = [
    {
        title: "What is your event about?",
        fields: [
            { id: "eventName", label: "Event Name*", placeholder: "Type the name of your event", type: "text" },
            //@ts-ignore
            {
                id: "category",
                label: "Category*",
                type: "select",
                options: ["Music", "Technology", "Art", "Workshop", "Networking", "Sports", "Other"]
            }
        ],
    },
    {
        title: "Details",
        fields: [
            { id: "description", label: "Description*", placeholder: "Describe your event", type: "text", isTextArea: true },
            { id: "dateTime", label: "Date & Time*", placeholder: "Select the date and time", type: "datetime-local" }
        ],
    },
    {
        title: "Event visibility",
        fields: [
            //@ts-ignore
            {
                id: "visibility",
                label: "Visibility*",
                type: "select",
                options: ["public", "private"]
            }
        ],
    },
];

const validateField = (fieldId: string, value: string): boolean => {
    if (!value.trim()) {
        alert(`${fieldId} is required.`);
        return false;
    }
    return true;
}

const validateDateTime = (dateTime: any) => {
    const selectedDateTime = new Date(dateTime);
    const now = new Date();
    return selectedDateTime > now;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, type }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialData?.thumbnailUrl || '/images/pngs/event.png');
    const [isFreeEvent, setIsFreeEvent] = useState<boolean>(initialData?.isFree || false);

    const handleUploadComplete = async (res: any) => {
        const file = res[0];
        setThumbnailUrl(file.url);
    };

    const handleUploadError = (error: Error) => {
        console.error("Upload error:", error);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();


        const isValid = validateField("eventName", e.currentTarget.eventName.value) &&
            validateField("category", e.currentTarget.category.value) &&
            validateField("description", e.currentTarget.description.value) &&
            validateField("location", e.currentTarget.location.value);

        if (!isValid) return;

        const dateTime = e.currentTarget.dateTime.value;
        if (!validateDateTime(dateTime)) {
            alert("The date and time must be in the future.");
            return;
        }


        const formData: EventFormData = {
            eventName: e.currentTarget.eventName.value,
            category: e.currentTarget.category.value,
            description: e.currentTarget.description.value,
            thumbnailUrl,
            location: e.currentTarget.location.value,
            visibility: e.currentTarget.visibility.value,
            isFree: isFreeEvent,
            price: isFreeEvent ? 0 : parseFloat(parseFloat(e.currentTarget.price.value).toFixed(2)),
            dateTime,
        };
    

        try {
            let response;
            if (type === 'create') {
                // Invoke the CreateEvent Server Action for creating events
                response = await createEvent(formData);
            } else {
                // Invoke the EditEvent Server Action for editing events
                //response = await editEvent(formData);
            }


            if (type === 'create') {
                console.log('Creating event with data:', formData);
            } else {
                console.log('Editing event with data:', formData);
            }
            console.log('Server Action Response:', response);
        } catch (error) {
            // Handle any errors
            console.error('Error submitting event:', error);
            // Implement your error handling logic here
        }
    };
    const minDateTime = new Date().toISOString().slice(0, 16);

    return (
        <LoadScript
            //@ts-ignore
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            libraries={["places"]}
        >
            <form onSubmit={handleSubmit}>
                {EVENT_FIELD_GROUPS.map(group => (
                    <div key={group.title} className='shadow-md p-10'>
                        <h3 className='text-xl pt-5 font-medium mb-4'>{group.title}</h3>
                        {group.fields.map(field => (
                            <div key={field.id} className="mb-4">
                                <label htmlFor={field.id} className="block text-gray-700 text-sm mb-2">
                                    {field.label}
                                </label>
                                {field.isTextArea ? (
                                    <textarea
                                        id={field.id}
                                        //@ts-ignore
                                        defaultValue={initialData?.[field.id as keyof EventFormData]}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                        placeholder={field.placeholder}
                                        rows={10}
                                    />
                                ) : field.type === "select" ? (
                                    <select
                                        id={field.id}
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        //@ts-ignore
                                        defaultValue={initialData?.[field.id as keyof EventFormData]}
                                    >
                                        {field.options?.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : field.type === "datetime-local" ? (
                                    <input
                                        id={field.id}
                                        type={field.type}
                                        //@ts-ignore
                                        defaultValue={initialData?.[field.id as keyof EventFormData]}
                                        min={minDateTime} // Add this line
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                        placeholder={field.placeholder}
                                    />
                                ) : (
                                    <input
                                        id={field.id}
                                        type={field.type}
                                        //@ts-ignore
                                        defaultValue={initialData?.[field.id as keyof EventFormData]}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                        placeholder={field.placeholder}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                <div className='shadow-md p-10'>
                    <h3 className='text-xl pt-5 font-medium mb-4'>Thumbnail</h3>
                    <div className="mb-4 flex flex-col items-center justify-center">
                        <div className='max-w-96 border rounded-xl'>
                            <img
                                src={thumbnailUrl || '/images/pngs/event.png'}
                                alt='Event Thumbnail'
                                className='w-full h-full object-cover object-center rounded'
                            />
                        </div>
                        <div className='w-full'>
                            <UploadButton
                                endpoint='imageUploader'
                                className='mt-2'
                                onClientUploadComplete={handleUploadComplete}
                                onUploadError={handleUploadError}
                                content={{
                                    button: (
                                        <a className='flex mx-auto link cursor-pointer font-semibold gap-2'>
                                            Change Image
                                        </a>
                                    )
                                }}
                                appearance={{
                                    button: {
                                        width: '100%',
                                        maxWidth: '350px'
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className='bg-white shadow-md p-10'>
                    <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">
                        Location
                    </label>
                    <Autocomplete>
                        <input
                            id="location"
                            type="text"
                            defaultValue={initialData?.location}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                            placeholder="Start typing location"
                        />
                    </Autocomplete>
                </div>

                <div className='bg-white shadow-md p-10'>
                    <h3 className='text-xl pt-5 font-medium mb-4'>Price</h3>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Is this event free?
                        </label>
                        <select
                            id="isFree"
                            value={isFreeEvent ? "true" : "false"}
                            onChange={(e) => setIsFreeEvent(e.target.value === "true")}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                        >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    {!isFreeEvent && (
                        <div className="mb-4">
                            <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
                                Price ($)
                            </label>
                            <input
                                id="price"
                                type="number"
                                defaultValue={initialData?.price}
                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                                placeholder="Enter event price"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-center mt-6 mb-6">
                    <button type="submit" className="btn btn-wide btn-primary text-white">Create Event</button>
                </div>
            </form>
        </LoadScript>
    );
};

export default EventForm;
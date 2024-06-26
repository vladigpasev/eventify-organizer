//Copyright (C) 2024  Vladimir Pasev
"use client"
import React, { useState, useRef } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import { UploadButton } from "@/utils/uploadthing";
import { createEvent } from '@/server/events/create';
import { generateDescription } from '@/server/events/generateDescription';
import { useRouter } from 'next/navigation';

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
        title: "Информация за събитието",
        fields: [
            { id: "eventName", label: "Име на събитие*", placeholder: "Напиши името на събитието си", type: "text" },
            //@ts-ignore
            {
                id: "category",
                label: "Категория*",
                type: "select",
                options: ["Музика", "Технологии", "Изкуство", "Работилница", "Нетуъркинг", "Спорт", "Образование", "Кулинария", "Мода", "Природа", "Здраве", "Наука", "Литература", "Кино", "Театър", "Танци", "Игри", "Благотворителност", "Празници", "История", "Политика", "Религия", "Комедия", "Други"]
            }
        ],
    },
    {
        title: "Детайли",
        fields: [
            { id: "description", label: "Описание*", placeholder: "Опиши събитието си", type: "text", isTextArea: true },
            { id: "dateTime", label: "Дата и час*", placeholder: "Избери дата и час", type: "datetime-local" }
        ],
    },
    {
        title: "Тип събитие",
        fields: [
            //@ts-ignore
            {
                id: "visibility",
                label: "Тип събитие*",
                type: "select",
                options: ["public", "private"],
            }
        ],
    },
];

const validateField = (fieldId: string, value: string): boolean => {
    if (!value.trim()) {
        alert(`${fieldId} е задължително поле.`);
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
    const [isLoadingDescription, setIsLoadingDescription] = useState<boolean>(false);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const router = useRouter();


    const handleUploadComplete = async (res: any) => {
        const file = res[0];
        setThumbnailUrl(file.url);
    };

    const handleUploadError = (error: Error) => {
        console.error("Upload error:", error);
    };

    const handleGenerateDescription = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        //@ts-ignore
        const eventName = e.currentTarget.form.eventName.value;
        //@ts-ignore
        const category = e.currentTarget.form.category.value;

        if (!eventName || !category) {
            alert('Име и категория на събитие са задължителни за генериране на описание.');
            return;
        }
        setIsLoadingDescription(true);

        try {
            const generatedText = await generateDescription(eventName, category);
            if (descriptionRef.current) {
                descriptionRef.current.value = generatedText;
            }
        } catch (error) {
            console.error('Error generating description:', error);
        } finally {
            setIsLoadingDescription(false); // Stop loading
        }

    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isValid = validateField("eventName", e.currentTarget.eventName.value) &&
            validateField("category", e.currentTarget.category.value) &&
            validateField("description", e.currentTarget.description.value) &&
            validateField("location", e.currentTarget.location.value);

        if (!isValid) {
            setIsSubmitting(false);
            return;
        }

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
                response = await createEvent(formData);
            } else {
                // response = await editEvent(formData);
            }

            if (type === 'create') {
                console.log('Creating event with data:', formData);
            } else {
                console.log('Editing event with data:', formData);
            }
            console.log('Server Action Response:', response);
            if(response?.success===true){
                router.replace('/dashboard');
            }else{
                setIsSubmitting(false);
                alert(response?.message);
                console.error('Error submitting event:', response?.message);
            }
            
        } catch (error) {
            console.error('Error submitting event:', error);
            setIsSubmitting(false);
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
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-secondary mb-2"
                                            onClick={handleGenerateDescription}
                                            disabled={isLoadingDescription} // Disable button during loading
                                        >
                                            {isLoadingDescription ? "Зареждане..." : "Генерирай с AI"}
                                        </button>
                                        <textarea
                                            ref={descriptionRef}
                                            id={field.id}
                                            //@ts-ignore
                                            defaultValue={initialData?.[field.id as keyof EventFormData]}
                                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                            placeholder={field.placeholder}
                                            rows={10}
                                            required
                                            minLength={20}
                                            maxLength={1000}
                                            disabled={isLoadingDescription}
                                        />
                                    </>
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
                                        min={minDateTime}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                        placeholder={field.placeholder}
                                        required
                                    />
                                ) : (
                                    <input
                                        id={field.id}
                                        type={field.type}
                                        //@ts-ignore
                                        defaultValue={initialData?.[field.id as keyof EventFormData]}
                                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-4"
                                        placeholder={field.placeholder}
                                        required
                                        minLength={3}
                                        maxLength={20}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                <div className='shadow-md p-10'>
                    <h3 className='text-xl pt-5 font-medium mb-4'>Заглавна снимка</h3>
                    <div className="mb-4 flex flex-col items-center justify-center">
                        <div className='max-w-96 border rounded-xl'>
                            <img
                                src={thumbnailUrl || '/images/pngs/event.png'}
                                alt='Заглавна снимка'
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
                                            Промени снимка
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
                        Локация
                    </label>
                    <Autocomplete>
                        <input
                            id="location"
                            type="text"
                            defaultValue={initialData?.location}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                            placeholder="Започнете да пишете локация"
                            required
                        />
                    </Autocomplete>
                </div>

                <div className='bg-white shadow-md p-10'>
                    <h3 className='text-xl pt-5 font-medium mb-4'>Цена</h3>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Събитието безплатно ли е
                        </label>
                        <select
                            id="isFree"
                            value={isFreeEvent ? "true" : "false"}
                            onChange={(e) => setIsFreeEvent(e.target.value === "true")}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                        >
                            <option value="true">Да</option>
                            <option value="false">Не</option>
                        </select>
                    </div>
                    {!isFreeEvent && (
                        <div className="mb-4">
                            <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
                                Цена (лв.)
                            </label>
                            <input
                                id="price"
                                type="number"
                                defaultValue={initialData?.price}
                                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                                placeholder="Въведете цена на събитието"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-center mt-6 mb-6">
                    <button
                        type="submit"
                        className="btn btn-wide btn-primary text-white"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Създаване...' : (type === 'create' ? 'Създай' : 'Редактирай')}
                    </button>
                </div>
            </form>
        </LoadScript>
    );
};

export default EventForm;

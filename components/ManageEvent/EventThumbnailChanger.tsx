"use client"
import React, { useState } from 'react';
import { editThumbnail } from '@/server/events/edit';
import { UploadButton } from '@/utils/uploadthing';
//@ts-ignore
const EventThumbnailChanger = ({ initialThumbnailUrl, eventId, isSeller }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialThumbnailUrl);

    const handleUploadComplete = async (res: any) => {
        const file = res[0];
        setThumbnailUrl(file.url);
        const thumbnailUrl = file.url;
        try {
            const response = await editThumbnail({ uuid: eventId, thumbnailUrl });

            if (response.success) {
                alert("Корицата е запазена успешно!");
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleUploadError = (error: Error) => {
        console.error("Upload error:", error);
    };

    return (
        <div className='mb-5'>
            {isSeller ? (
                <div>
                    <div className='max-w-xs w-full h-48 overflow-hidden rounded-xl border'>
                        <img
                            src={initialThumbnailUrl}
                            alt='Корица на събитие'
                            className='w-full h-full object-cover object-center'
                        />
                    </div>
                </div>
            ) : (
                <div className='flex flex-col items-center justify-center w-fit'>
                    <div className='max-w-xs w-full h-48 overflow-hidden rounded-xl border'>
                        <img
                            src={thumbnailUrl}
                            alt='Корица на събитие'
                            className='w-full h-full object-cover object-center'
                        />
                    </div>
                    <div className='w-full'>
                        <UploadButton
                            endpoint='imageUploader'
                            className='mt-2 z-20'
                            onClientUploadComplete={handleUploadComplete}
                            onUploadError={handleUploadError}
                            content={{
                                button: (
                                    <a className='flex mx-auto link cursor-pointer font-semibold gap-2 z-20'>
                                        Промени корица
                                    </a>
                                )
                            }}
                            appearance={{
                                button: {
                                    width: '100%',
                                    maxWidth: '350px',
                                    zIndex: 1,
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventThumbnailChanger;
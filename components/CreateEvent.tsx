"use client"
import React, { useState } from 'react';
import EventModal from './EventModal';

const CreateEvent: React.FC = () => {
    const [showModal, setShowModal] = useState<boolean>(false);

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    return (
        <div>
            <div
                className="w-[47px] h-[46px] px-3.5 py-2.5 bg-white rounded-xl border border-blue-800 justify-center items-center gap-2.5 inline-flex cursor-pointer"
                onClick={handleOpenModal}
            >
                <div className="text-blue-800 text-base font-medium font-['Poppins'] leading-relaxed">+</div>
            </div>
            {showModal && <EventModal onClose={handleCloseModal} />}
        </div>
    );
};

export default CreateEvent;

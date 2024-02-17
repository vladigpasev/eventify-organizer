"use client"
import React, { useState } from 'react';
import { deleteEvent } from '@/server/events/edit';
import { useRouter } from 'next/navigation';

//@ts-ignore
function Modal({ onClose, onConfirm, isLoading }) {
  const [inputEventName, setInputEventName] = useState('');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold">Confirm Deletion</h3>
        <p className="text-sm">Please enter the event name to confirm deletion:</p>
        <input
          type="text"
          className="w-full mt-3 mb-3 p-2 border rounded"
          value={inputEventName}
          onChange={(e) => setInputEventName(e.target.value)}
        />
        <button
          className="btn bg-red-500 w-full text-white mt-2"
          onClick={() => onConfirm(inputEventName)}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Confirm Delete'}
        </button>
        <button
          className="btn bg-gray-500 w-full text-white mt-2"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

//@ts-ignore
function DeleteEvent({ eventId, eventName }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDeleteClick = () => {
    setShowModal(true);
  };
  //@ts-ignore
  const handleConfirmDelete = async (inputEventName) => {
    if (inputEventName !== eventName) {
      alert("Event name does not match.");
      return;
    }

    setIsLoading(true);
    try {
      await deleteEvent(eventId);
      router.replace("/dashboard");
    } catch (error) {
      // Handle error
      setIsLoading(false);
    }
    setShowModal(false);
  };

  return (
    <div>
      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmDelete}
          isLoading={isLoading}
        />
      )}
      <button
        className={`btn bg-red-500 w-full text-white mt-5 ${isLoading ? 'opacity-50' : ''}`}
        onClick={handleDeleteClick}
        disabled={isLoading}
      >
        Delete Event
      </button>
    </div>
  );
}

export default DeleteEvent;

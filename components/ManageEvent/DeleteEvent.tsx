"use client"

import React, { useState } from 'react';
import { deleteEvent } from '@/server/events/edit';
import { useRouter } from 'next/navigation';
//@ts-ignore
function DeleteEvent({ eventId }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteEvent(eventId);
      router.replace("/dashboard");
    } catch (error) {
      // Handle error - you might want to show an error message
    }
  };

  return (
    <div>
      <button 
        className={`btn bg-red-500 w-full text-white mt-5 ${isLoading ? 'opacity-50' : ''}`}
        onClick={handleDelete}
        disabled={isLoading}
      >
        {isLoading ? 'Deleting...' : 'Delete Event'}
      </button>
    </div>
  );
}

export default DeleteEvent;

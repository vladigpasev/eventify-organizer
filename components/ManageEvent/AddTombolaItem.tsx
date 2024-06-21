"use client";
import React, { useState } from 'react';
import { addTombolaItem } from '@/server/events/add_tombola_item'; // Adjust the import path as needed

interface AddItemProps {
  eventId: string;
  onItemAdded: () => void;
  userUuid: string;
}

const AddTombolaItem = ({ eventId, onItemAdded, userUuid }: AddItemProps) => {
  const [itemName, setItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = async () => {
    setIsAdding(true);
    setError(null);

    try {
      const data = await addTombolaItem({ itemName, eventUuid: eventId });

      if (data.success) {
        setItemName('');
        onItemAdded();
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError('An error occurred while adding the item.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Item Name"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        className="input mb-2"
      />
      <button
        onClick={handleAddItem}
        className="btn btn-primary"
        disabled={isAdding}
      >
        {isAdding ? 'Adding...' : 'Add Item'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default AddTombolaItem;

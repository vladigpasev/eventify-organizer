"use client"
import React, { useState } from 'react';
import { addSeller } from '@/server/sellers/actions';
//@ts-ignore
function SellTickets({ eventUuid, isSeller }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  //@ts-ignore
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await addSeller({ email, eventUuid: eventUuid });
      if (!response.success) {
        //@ts-ignore
        setError(response.message);
      } else {
        setEmail('');

      }
    } catch (error) {
      setError('An error occurred while adding the seller.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      {isSeller && (<></>) || <>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">
            Въведи имейл
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path
                  d="M64 112c-8.8 0-16 7.2-16 16v22.1L220.5 291.7c20.7 17 50.4 17 71.1 0L464 150.1V128c0-8.8-7.2-16-16-16H64zM48 212.2V384c0 8.8 7.2 16 16 16H448c8.8 0 16-7.2 16-16V212.2L322 328.8c-38.4 31.5-93.7 31.5-132 0L48 212.2zM0 128C0 92.7 28.7 64 64 64H448c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <input
              name="email"
              type="email"
              id="email"
              className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Въведи имейл"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input name="eventUuid" type="hidden" id="eventUuid" value={eventUuid} />
            <button
              type="submit"
              className={`text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Добави'}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      </>}
      <div>
        
      </div>
    </div>
  );
}

export default SellTickets;

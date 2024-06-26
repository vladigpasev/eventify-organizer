"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TicketActionsBtn from '@/components/ManageEvent/TicketActionsBtn';
import TicketDeactivateBtn from '@/components/ManageEvent/TicketDeactivateBtn';
import { getUsers } from '@/server/events/getUsers';
import AddCustomer from './AddCustomer';
import CheckTicket from './CheckTickets';
import SendEmailToAll from './SendEmailToAll';
import { getCurrentLimit, changeLimit } from '@/server/events/limit'; // Import the necessary functions
import { getCurrentTombolaPrice, changeTombolaPrice } from '@/server/events/tombola_price';

export const maxDuration = 300;

interface UserTableProps {
  eventId: string;
  isSeller: boolean | undefined;
  userUuid: string;
}

interface Customer {
  uuid: string;
  firstname: string;
  lastname: string;
  email: string;
  guestCount: number;
  ticketToken: string;
  isEntered: boolean;
  paperTicket: string;
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerCurrent: boolean;
  reservation: boolean;
}

const UserTable = ({ eventId, isSeller, userUuid }: UserTableProps) => {
  const [users, setUsers] = useState<Customer[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [limitLoading, setLimitLoading] = useState<boolean>(false);
  const [isLimitChanged, setIsLimitChanged] = useState<boolean>(false);
  const [tombolaPrice, setTombolaPrice] = useState<string | null>(null);
  const [isTombolaPriceChanged, setIsTombolaPriceChanged] = useState<boolean>(false);

  const enteredCount = users.filter(user => user.isEntered).length;
  const reservationCount = users.filter(user => user.reservation).length;
  const ticketCount = users.length - reservationCount;

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const userResponse = await getUsers(eventId);
      //@ts-ignore
      setUsers(userResponse);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLimit = async () => {
    try {
      const currentLimit = await getCurrentLimit({ eventUuid: eventId });
      setLimit(currentLimit.limit || '');
    } catch (err) {
      console.error('Error fetching limit:', err);
    }
  };

  const fetchTombolaPrice = async () => {
    try {
      const currentTombolaPrice = await getCurrentTombolaPrice({ eventUuid: eventId });
      setTombolaPrice(currentTombolaPrice.tombolaPrice || '');
    } catch (err) {
      console.error('Error fetching tombola price:', err);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(e.target.value);
    setIsLimitChanged(true);
  };

  const handleLimitSubmit = async () => {
    setLimitLoading(true);
    try {
      await changeLimit({ limit: limit, eventUuid: eventId });
      setIsLimitChanged(false);
    } catch (err) {
      console.error('Error changing limit:', err);
    } finally {
      setLimitLoading(false);
    }
  };

  const handleTombolaPriceSubmit = async () => {
    setLimitLoading(true);
    try {
      await changeTombolaPrice({ tombolaPrice: tombolaPrice, eventUuid: eventId });
      setIsTombolaPriceChanged(false);
    } catch (err) {
      console.error('Error changing tombola price:', err);
    } finally {
      setLimitLoading(false);
    }
  };

  const handleTombolaPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTombolaPrice(e.target.value);
    setIsTombolaPriceChanged(true);
  };

  useEffect(() => {
    fetchUsers();
    fetchLimit();
    fetchTombolaPrice();
  }, [eventId]);

  useEffect(() => {
    const filtered = users.filter(user => {
      const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
      const sellerFullName = user.sellerName ? `${user.sellerName} (${user.sellerEmail})`.toLowerCase() : '';
      const combinedSearch = `${fullName} ${user.email} ${user.paperTicket || ''} ${sellerFullName}`;
      return combinedSearch.includes(searchTerm.toLowerCase());
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  if (error) return <p>Error loading users: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded p-4 text-black">
      <div className='flex justify-between items-center'>
        <h2 className="text-xl font-semibold mb-3">Билети</h2>
        <div className='flex gap-2 sm:flex-row flex-col'>
          <AddCustomer eventId={eventId} onCustomerAdded={fetchUsers} userUuid={userUuid} />
          <CheckTicket eventId={eventId} onEnteredOrExited={fetchUsers} />
          <a href={`/dashboard/events/${eventId}/tombola`} className='btn'>Томбола</a>
        </div>
      </div>
      {isSeller && (
        <div>
          <div className='pb-5'><strong>Лимит на билетите: {limit || 'няма'}</strong></div>
          <div className='pb-5'><strong>Цена на билет от томболата: {tombolaPrice || 'няма'}</strong></div>
        </div>
      ) || (
        <div>
          <form className="max-w-sm mb-2" onSubmit={(e) => { e.preventDefault(); handleLimitSubmit(); }}>
            <label htmlFor="limit-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Лимит на билетите (оставете празно, ако няма):</label>
            <input
              type="number"
              id="limit-input"
              aria-describedby="helper-text-explanation"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Няма лимит"
              min={0}
              value={limit || ''}
              onChange={handleLimitChange}
            />
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={!isLimitChanged || limitLoading}
            >
              {limitLoading ? 'Зареждане...' : 'Промени лимита'}
            </button>
          </form>
          <form className="max-w-sm mb-2" onSubmit={(e) => { e.preventDefault(); handleTombolaPriceSubmit(); }}>
            <label htmlFor="tombola-price-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Цена на томбола (оставете празно, ако няма):</label>
            <input
              type="number"
              id="tombola-price-input"
              aria-describedby="helper-text-explanation"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Няма томбола"
              min={0}
              value={tombolaPrice || ''}
              onChange={handleTombolaPriceChange}
            />
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={!isTombolaPriceChanged || limitLoading}
            >
              {limitLoading ? 'Зареждане...' : 'Промени цената на томболата'}
            </button>
          </form>
        </div>
      )}
      {isLoading ? <>Зареждане...</> :
        <>
          {isSeller || (
            <div><SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} /></div>
          )}
          <div className="mb-4">
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
              {ticketCount} Билети
            </span>
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
              {reservationCount} Резервации
            </span>
            <span className="bg-green-100 text-green-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-800">
              {enteredCount} влeзли
            </span>
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Търси"
              className="input border border-gray-200 w-full mb-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Име</th>
                  <th>Имейл</th>
                  <th>Брой гости</th>
                  <th>Хартиен билет</th>
                  <th>Продавач</th>
                  <th>Дата и час на издаване</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((customer, index) => (
                  <tr key={index} className={customer.reservation ? 'bg-blue-100' : ''}>
                    <th></th>
                    <td>
                      <div className="flex items-center">
                        <div className="avatar"></div>
                        <div>
                          <div className={`font-bold ${customer.isEntered ? 'text-yellow-500' : ''}`}>{`${customer.firstname} ${customer.lastname}`}</div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.guestCount}</td>
                    <td>{customer.paperTicket || 'няма'}</td>
                    <td>{customer.sellerName} ({customer.sellerEmail})</td>
                    <td>{customer.createdAt}</td>
                    <th>
                      <Link className="btn btn-ghost btn-xs text-black" href={`https://tickets.eventify.bg/` + customer.ticketToken} target='_blank'>
                        <svg height="24" viewBox="0 0 1792 1792" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1024 452l316 316-572 572-316-316zm-211 979l618-618q19-19 19-45t-19-45l-362-362q-18-18-45-18t-45 18l-618 618q-19 19-19 45t19 45l362 362q18 18 45 18t45-18zm889-637l-907 908q-37 37-90.5 37t-90.5-37l-126-126q56-56 56-136t-56-136-136-56-136 56l-125-126q-37-37-37-90.5t37-90.5l907-906q37-37 90.5-37t90.5 37l125 125q-56 56-56 136t56 136 136 56 136-56l126 125q37 37 37 90.5t-37 90.5z" fill='currentColor' />
                        </svg>
                      </Link>
                    </th>
                    <th>
                      <TicketActionsBtn ticketToken={customer.ticketToken} eventId={eventId} onEnteredOrExited={fetchUsers} />
                    </th>
                    <th>
                      <TicketDeactivateBtn customerUuid={customer.uuid} disabled={!customer.sellerCurrent && isSeller} />
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
    </div>
  );
};

export default UserTable;

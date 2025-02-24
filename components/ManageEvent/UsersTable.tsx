"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TicketActionsBtn from '@/components/ManageEvent/TicketActionsBtn';
import TicketDeactivateBtn from '@/components/ManageEvent/TicketDeactivateBtn';
import { getUsers } from '@/server/events/getUsers';
import AddCustomer from './AddCustomer';
import CheckTicket from './CheckTickets';
import SendEmailToAll from './SendEmailToAll';
import { getCurrentLimit, changeLimit } from '@/server/events/limit';
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
  paperTicket: string | null;
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerCurrent: boolean;
  reservation: boolean;
  ticketCode?: string;
  ticket_type?: string;
  guestSchoolName?: string | null;
  guestExternalGrade?: string | null;
  expiresSoon?: boolean;
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

  // Проверка дали събитието е "фашинг"
  const isFasching = eventId === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d";

  // При фашинг: reservation = (paid=false) => брой билети = users.length (нямаме guestCount)
  // Иначе: брой билети = users.length - reservationCount
  const enteredCount = users.filter(user => user.isEntered).length;
  const reservationCount = users.filter(user => user.reservation).length;
  const ticketCount = isFasching ? users.length : users.length - reservationCount;

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

  // Функция за сортиране на Фашинг класове
  function getFaschingClassPriority(customer: Customer): number {
    // Подредба: 8а, 8б, 8в, 8г, 8д, 8е, 8ж, 9а ... 12ж
    const classesOrder = [
      "8а","8б","8в","8г","8д","8е","8ж",
      "9а","9б","9в","9г","9д","9е","9ж",
      "10а","10б","10в","10г","10д","10е","10ж",
      "11а","11б","11в","11г","11д","11е","11ж",
      "12а","12б","12в","12г","12д","12е","12ж"
    ];

    const cGroup = customer.paperTicket || "";

    // Ако е в класовете, връщаме индекса
    const foundIndex = classesOrder.indexOf(cGroup);
    if (foundIndex >= 0) {
      return foundIndex;
    }

    // Ако е "external-guest"
    if (cGroup === "external-guest") {
      const gradeNum = Number(customer.guestExternalGrade);
      if (!isNaN(gradeNum) && gradeNum >= 8 && gradeNum <= 12) {
        // 8 => 100, 9 => 101, ..., 12 => 104
        return 100 + (gradeNum - 8);
      }
      // Ако не е (adult?), даваме 105
      return 105;
    }

    // Ако е "adult"
    if (cGroup === "adult") {
      return 200;
    }

    // Ако е "teacher"
    if (cGroup === "teacher") {
      return 300;
    }

    // Иначе най-отзад
    return 999;
  }

  useEffect(() => {
    fetchUsers();
    // Ако не е фашинг, извличаме лимита и цената на томболата
    if (!isFasching) {
      fetchLimit();
      fetchTombolaPrice();
    }
  }, [eventId, isFasching]);

  useEffect(() => {
    // 1) Филтриране по searchTerm
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = users.filter(user => {
      const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
      const sellerFullName = user.sellerName
        ? `${user.sellerName} (${user.sellerEmail})`.toLowerCase()
        : '';
      const ticketCode = user.ticketCode || '';
      const ticketType = user.ticket_type || '';
      const combinedSearch = `${fullName} ${user.email} ${user.paperTicket || ''} ${sellerFullName} ${ticketCode} ${ticketType}`;

      return combinedSearch.includes(lowerSearch);
    });

    // 2) Сортиране
    let sorted: Customer[];
    if (isFasching) {
      // Специална подредба за Фашинг
      sorted = [...filtered].sort((a, b) => {
        // 1) група (classPriority)
        const groupA = getFaschingClassPriority(a);
        const groupB = getFaschingClassPriority(b);
        if (groupA !== groupB) {
          return groupA - groupB;
        }
        // 2) азбучно по име + фамилия
        const nameA = (a.firstname + " " + a.lastname).toLowerCase();
        const nameB = (b.firstname + " " + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Ако не е фашинг, може просто по име и фамилия
      sorted = [...filtered].sort((a, b) => {
        const nameA = (a.firstname + " " + a.lastname).toLowerCase();
        const nameB = (b.firstname + " " + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    setFilteredUsers(sorted);
  }, [searchTerm, users, isFasching]);

  if (error) return <p>Error loading users: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded p-4 text-black">
      <div className='flex justify-between items-center'>
        <h2 className="text-xl font-semibold mb-3">Билети</h2>
        <div className='flex gap-2 sm:flex-row flex-col'>
          {/* Ако е фашинг, бутонът "Създай билет" ще се показва с етикет "Събери пари" */}
          <AddCustomer 
            eventId={eventId} 
            onCustomerAdded={fetchUsers} 
            userUuid={userUuid} 
            buttonLabel={isFasching ? "Събери пари" : "Създай билет"} 
          />
          <CheckTicket eventId={eventId} onEnteredOrExited={fetchUsers} />
          {/* Премахваме бутона за томбола, ако е фашинг */}
          {!isFasching && (
            <a href={`/dashboard/events/${eventId}/tombola`} className='btn'>Томбола</a>
          )}
        </div>
      </div>
      
      {/* Показваме лимита и цената само ако не е фашинг */}
      {!isFasching && (
        isSeller ? (
          <div>
            <div className='pb-5'>
              <strong>Лимит на билетите: {limit || 'няма'}</strong>
            </div>
            <div className='pb-5'>
              <strong>Цена на билет от томболата: {tombolaPrice || 'няма'}</strong>
            </div>
          </div>
        ) : (
          <div>
            <form className="max-w-sm mb-2" onSubmit={(e) => { e.preventDefault(); handleLimitSubmit(); }}>
              <label htmlFor="limit-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Лимит на билетите (оставете празно, ако няма):
              </label>
              <input
                type="number"
                id="limit-input"
                aria-describedby="helper-text-explanation"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg
                           focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
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
              <label htmlFor="tombola-price-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Цена на томболата (оставете празно, ако няма):
              </label>
              <input
                type="number"
                id="tombola-price-input"
                aria-describedby="helper-text-explanation"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg
                           focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
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
        )
      )}

      {isLoading ? (
        <>Зареждане...</>
      ) : (
        <>
          {/* Премахваме бутона за изпращане на имейл при фашинг */}
          {!isSeller && !isFasching && (
            <div>
              <SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} />
            </div>
          )}

          <div className="mb-4">
            {isFasching ? (
              // При фашинг показваме общия брой билети (без резервации и guestCount)
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
                {ticketCount} Билети
              </span>
            ) : (
              <>
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
                  {ticketCount} Билети
                </span>
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
                  {reservationCount} Резервации
                </span>
                <span className="bg-green-100 text-green-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
                  {enteredCount} влeзли
                </span>
              </>
            )}
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
            {isFasching ? (
              // Новата таблица за фашинг
              <table className="table">
                <thead>
                  <tr>
                    <th>Име</th>
                    <th>Имейл</th>
                    <th>Клас</th>
                    <th>Училище</th>
                    <th>Външен клас</th>
                    <th>Плащане код</th>
                    <th>Код на билета</th>
                    <th>Тип на билета</th>
                    <th>Дата и час на издаване</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((customer, index) => {
                    return (
                      <tr key={index} className={customer.reservation ? 'bg-blue-100' : ''}>
                        <td>
                          <div className="flex items-center">
                            <div>
                              <div
                                className={`font-bold ${customer.isEntered ? 'text-yellow-500' : ''}`}
                              >
                                {customer.expiresSoon && (
                                  <span className="text-red-500 ml-1">❗</span>
                                )}
                                {customer.firstname} {customer.lastname}
                                
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{customer.email}</td>
                        <td>{customer.paperTicket || '—'}</td>
                        {/* Новите 2 колони за "външни гости" */}
                        <td>
                          {customer.paperTicket === 'external-guest'
                            ? (customer.guestSchoolName || '—')
                            : '—'
                          }
                        </td>
                        <td>
                          {customer.paperTicket === 'external-guest'
                            ? (customer.guestExternalGrade || '—')
                            : '—'
                          }
                        </td>
                        <td>{customer.ticketToken}</td>
                        <td>{customer.ticketCode || 'няма'}</td>
                        <td>{customer.ticket_type || 'няма'}</td>
                        <td>{customer.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // Оригинална таблица за другите събития
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
                          <div>
                            <div className={`font-bold ${customer.isEntered ? 'text-yellow-500' : ''}`}>
                              {customer.firstname} {customer.lastname}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{customer.email}</td>
                      <td>{customer.guestCount}</td>
                      <td>{customer.paperTicket || 'няма'}</td>
                      <td>
                        {customer.sellerName} ({customer.sellerEmail})
                      </td>
                      <td>{customer.createdAt}</td>
                      <th>
                        <Link
                          className="btn btn-ghost btn-xs text-black"
                          href={`https://tickets.eventify.bg/` + customer.ticketToken}
                          target='_blank'
                        >
                          <svg height="24" viewBox="0 0 1792 1792" width="24" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M1024 452l316 316-572 572-316-316zm-211 979l618-618q19-19 19-45t-19-45l-362-362q-18-18-45-18t-45 18l-618 618q-19 19-19 45t19 45l362 362q18 18 45 18t45-18zm889-637l-907 908q-37 37-90.5 37t-90.5-37l-126-126q56-56 56-136t-56-136-136-56-136 56l-125-126q-37-37-37-90.5t37-90.5l907-906q37-37 90.5-37t90.5 37l125 125q-56 56-56 136t56 136 136 56 136-56l126 125q37 37 37 90.5t-37 90.5z"
                              fill="currentColor"
                            />
                          </svg>
                        </Link>
                      </th>
                      <th>
                        <TicketActionsBtn
                          ticketToken={customer.ticketToken}
                          eventId={eventId}
                          onEnteredOrExited={fetchUsers}
                        />
                      </th>
                      <th>
                        <TicketDeactivateBtn
                          customerUuid={customer.uuid}
                          disabled={!customer.sellerCurrent && isSeller}
                        />
                      </th>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserTable;

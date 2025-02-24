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
import { confirmAddAfterUpgrade } from '@/server/fasching/faschingActions';

export const maxDuration = 300;

interface UserTableProps {
  eventId: string;
  isSeller: boolean | undefined;
  userUuid: string;
}

interface Customer {
  uuid: string; // при фашинг => ticketId (string)
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
  reservation: boolean; // при фашинг => неплатен

  // Полета специфични за фашинг
  ticketCode?: string;
  ticket_type?: string;
  guestSchoolName?: string | null;
  guestExternalGrade?: string | null;
  expiresSoon?: boolean;
  isEnteredFasching?: boolean;
  isEnteredAfter?: boolean;
}

const UserTable = ({ eventId, isSeller, userUuid }: UserTableProps) => {
  const [users, setUsers] = useState<Customer[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Лимит и томбола (за не-фашинг)
  const [limit, setLimit] = useState<string | null>(null);
  const [limitLoading, setLimitLoading] = useState<boolean>(false);
  const [isLimitChanged, setIsLimitChanged] = useState<boolean>(false);

  const [tombolaPrice, setTombolaPrice] = useState<string | null>(null);
  const [isTombolaPriceChanged, setIsTombolaPriceChanged] = useState<boolean>(false);

  // Определяме дали е фашинг
  const isFasching = (eventId === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

  // 8-класове
  const eighthGradeSet = new Set(["8а", "8б", "8в", "8г", "8д", "8е", "8ж"]);

  // НЕ-фашинг статистики
  const enteredCount = users.filter(user => user.isEntered).length;
  const reservationCount = users.filter(user => user.reservation).length;
  const ticketCount = users.length;

  // ФАШИНГ статистики
  let faschingPaidCount = 0;
  let faschingEnteredFasching = 0;
  let faschingEnteredAfter = 0;
  let faschingEnteredBoth = 0;
  if (isFasching) {
    faschingPaidCount = users.filter(u => !u.reservation).length;
    faschingEnteredFasching = users.filter(u => u.isEnteredFasching).length;
    faschingEnteredAfter = users.filter(u => u.isEnteredAfter).length;
    faschingEnteredBoth = users.filter(u => u.isEnteredFasching && u.isEnteredAfter).length;
  }

  // -------------------------------
  // МОДАЛ за „Добави афтър“
  // -------------------------------
  const [isAddAfterModalOpen, setAddAfterModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Customer | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [addAfterError, setAddAfterError] = useState<string>('');
  const [addAfterSuccessMsg, setAddAfterSuccessMsg] = useState<string>('');
  // Разлика: 25 (fasching-after) - 10 (fasching) = 15
  const upgradeCost = 15;

  // >>> NEW: loading state for the "Потвърди" button
  const [isUpgrading, setIsUpgrading] = useState(false);

  function openAddAfterModal(ticket: Customer) {
    setCurrentTicket(ticket);
    setPaidAmount('');
    setChange(0);
    setAddAfterError('');
    setAddAfterSuccessMsg('');
    setAddAfterModalOpen(true);
  }

  function closeAddAfterModal() {
    setAddAfterModalOpen(false);
    setCurrentTicket(null);
  }

  async function handleConfirmAddAfter() {
    if (!currentTicket) return;
    const ticketId = parseInt(currentTicket.uuid, 10);
    if (isNaN(ticketId)) {
      setAddAfterError("Невалиден ticketId");
      return;
    }
    const paidNum = parseFloat(paidAmount);
    if (isNaN(paidNum) || paidNum <= 0) {
      setAddAfterError("Моля въведете валидна сума.");
      return;
    }
    try {
      // Start loading
      setIsUpgrading(true);

      const result = await confirmAddAfterUpgrade({
        ticketId,
        paidAmount: paidNum,
        sellerId: userUuid,
      });
      if (!result.success) {
        setAddAfterError(result.message || "Грешка при ъпгрейд.");
      } else {
        setChange(result.change ?? 0);
        setAddAfterSuccessMsg("Билетът е обновен до Fasching + After!");
        // Презареждаме списъка
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setAddAfterError("Неуспешен ъпгрейд.");
    } finally {
      // Stop loading
      setIsUpgrading(false);
    }
  }

  // -------------------------------
  // Зареждане на данни
  // -------------------------------
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
      const data = await getCurrentLimit({ eventUuid: eventId });
      setLimit(data.limit || '');
    } catch (err) {
      console.error('Error fetching limit:', err);
    }
  };

  const fetchTombolaPrice = async () => {
    try {
      const data = await getCurrentTombolaPrice({ eventUuid: eventId });
      setTombolaPrice(data.tombolaPrice || '');
    } catch (err) {
      console.error('Error fetching tombola price:', err);
    }
  };

  // -------------------------------
  // Логика за лимит/томбола
  // -------------------------------
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(e.target.value);
    setIsLimitChanged(true);
  };

  const handleLimitSubmit = async () => {
    setLimitLoading(true);
    try {
      await changeLimit({ limit, eventUuid: eventId });
      setIsLimitChanged(false);
    } catch (err) {
      console.error('Error changing limit:', err);
    } finally {
      setLimitLoading(false);
    }
  };

  const handleTombolaPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTombolaPrice(e.target.value);
    setIsTombolaPriceChanged(true);
  };

  const handleTombolaPriceSubmit = async () => {
    setLimitLoading(true);
    try {
      await changeTombolaPrice({ tombolaPrice, eventUuid: eventId });
      setIsTombolaPriceChanged(false);
    } catch (err) {
      console.error('Error changing tombola price:', err);
    } finally {
      setLimitLoading(false);
    }
  };

  // -------------------------------
  // ФАШИНГ: сортиране/цветове
  // -------------------------------
  function getFaschingClassPriority(customer: Customer): number {
    const classesOrder = [
      "8а", "8б", "8в", "8г", "8д", "8е", "8ж",
      "9а", "9б", "9в", "9г", "9д", "9е", "9ж",
      "10а", "10б", "10в", "10г", "10д", "10е", "10ж",
      "11а", "11б", "11в", "11г", "11д", "11е", "11ж",
      "12а", "12б", "12в", "12г", "12д", "12е", "12ж"
    ];

    const cGroup = customer.paperTicket || "";
    const foundIndex = classesOrder.indexOf(cGroup);
    if (foundIndex >= 0) return foundIndex;

    if (cGroup === "external-guest") {
      const gradeNum = Number(customer.guestExternalGrade);
      if (!isNaN(gradeNum) && gradeNum >= 8 && gradeNum <= 12) {
        return 100 + (gradeNum - 8);
      }
      return 105; // adult
    }
    if (cGroup === "adult") return 200;
    if (cGroup === "teacher") return 300;
    return 999;
  }

  function getFaschingRowColor(customer: Customer): string {
    if (customer.reservation) {
      return 'bg-red-100'; // неплатен
    }
    const f = customer.isEnteredFasching;
    const a = customer.isEnteredAfter;
    if (f && a) return 'bg-purple-100';
    if (f) return 'bg-green-100';
    if (a) return 'bg-blue-100';
    return '';
  }

  function getFaschingEntryStatus(customer: Customer): string {
    if (customer.reservation) return 'Неплатен';
    const f = customer.isEnteredFasching;
    const a = customer.isEnteredAfter;
    if (f && a) return 'Влязъл и във Fasching, и в After';
    if (f) return 'Влязъл във Fasching';
    if (a) return 'Влязъл в After';
    return 'Платен, но не е влязъл';
  }

  // -------------------------------
  // useEffect -> зареждане
  // -------------------------------
  useEffect(() => {
    fetchUsers();
    if (!isFasching) {
      fetchLimit();
      fetchTombolaPrice();
    }
  }, [eventId, isFasching]);

  // Филтриране + сортиране
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const tmp = users.filter(u => {
      const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
      const sellerFull = u.sellerName ? `${u.sellerName} (${u.sellerEmail})`.toLowerCase() : "";
      const combined = `${fullName} ${u.email} ${u.paperTicket || ''} ${sellerFull} ${u.ticketCode || ''} ${u.ticket_type || ''} ${u.ticketToken}`;
      return combined.includes(lower);
    });

    let sorted: Customer[];
    if (isFasching) {
      sorted = [...tmp].sort((a, b) => {
        const ga = getFaschingClassPriority(a);
        const gb = getFaschingClassPriority(b);
        if (ga !== gb) return ga - gb;
        const nameA = (a.firstname + a.lastname).toLowerCase();
        const nameB = (b.firstname + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      sorted = [...tmp].sort((a, b) => {
        const nameA = (a.firstname + a.lastname).toLowerCase();
        const nameB = (b.firstname + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    setFilteredUsers(sorted);
  }, [searchTerm, users, isFasching]);

  if (error) {
    return <p className="text-red-500">Error loading users: {error.message}</p>;
  }

  return (
    <div className="bg-white shadow rounded p-4 text-black">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold mb-3">Билети</h2>
        <div className="flex gap-2 sm:flex-row flex-col">
          <AddCustomer
            eventId={eventId}
            onCustomerAdded={fetchUsers}
            userUuid={userUuid}
            buttonLabel={isFasching ? "Събери пари" : "Създай билет"}
          />
          <CheckTicket eventId={eventId} onEnteredOrExited={fetchUsers} />
          {!isFasching && (
            <a href={`/dashboard/events/${eventId}/tombola`} className="btn">
              Томбола
            </a>
          )}
        </div>
      </div>

      {!isFasching && (
        isSeller ? (
          <div>
            <div className="pb-5">
              <strong>Лимит на билетите: {limit || 'няма'}</strong>
            </div>
            <div className="pb-5">
              <strong>Цена на билет от томболата: {tombolaPrice || 'няма'}</strong>
            </div>
          </div>
        ) : (
          <div>
            <form className="max-w-sm mb-2" onSubmit={(e) => { e.preventDefault(); handleLimitSubmit(); }}>
              <label htmlFor="limit-input" className="block mb-2 text-sm font-medium">
                Лимит на билетите (оставете празно, ако няма):
              </label>
              <input
                type="number"
                id="limit-input"
                className="input input-bordered w-full"
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
              <label htmlFor="tombola-price-input" className="block mb-2 text-sm font-medium">
                Цена на томболата (оставете празно, ако няма):
              </label>
              <input
                type="number"
                id="tombola-price-input"
                className="input input-bordered w-full"
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
                {limitLoading ? 'Зареждане...' : 'Промени цената'}
              </button>
            </form>
          </div>
        )
      )}

      {isLoading ? (
        <p>Зареждане...</p>
      ) : (
        <>
          {/* Бутон "Изпрати имейл до всички" (само при не-фашинг и не-seller) */}
          {!isFasching && !isSeller && (
            <SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} />
          )}

          {/* Статистика: Фашинг */}
          {isFasching && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                Общо билети: {ticketCount}
              </span>
              <span className="bg-green-100 text-green-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                Платени: {faschingPaidCount}
              </span>
              <span className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                Влязли (Fasching): {faschingEnteredFasching}
              </span>
              <span className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                Влязли (After): {faschingEnteredAfter}
              </span>
              <span className="bg-purple-100 text-purple-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                Влязли (Fasching & After): {faschingEnteredBoth}
              </span>
            </div>
          )}

          {/* Статистика: НЕ-фашинг */}
          {!isFasching && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                {ticketCount - reservationCount} Билети
              </span>
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                {reservationCount} Резервации
              </span>
              <span className="bg-green-100 text-green-800 text-sm font-semibold px-2.5 py-0.5 rounded">
                {enteredCount} влeзли
              </span>
            </div>
          )}

          {/* Търсене */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Търси"
              className="input border border-gray-200 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Таблица */}
          <div className="overflow-x-auto">
            {isFasching ? (
              // ********** Таблица за ФАШИНГ **********
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Име</th>
                    <th>Имейл</th>
                    <th>Клас</th>
                    <th>Училище</th>
                    <th>Външен клас</th>
                    <th>Плащане код</th>
                    <th>Код на билета</th>
                    <th>Тип</th>
                    <th>Дата/час</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((cust, idx) => {
                    const rowColor = getFaschingRowColor(cust);

                    const isFaschingTicket = (cust.ticket_type === "fasching");
                    const isEighthGrader = eighthGradeSet.has(cust.paperTicket || "");
                    const isUnpaid = cust.reservation === true;

                    const disableAddAfter = isUnpaid || isEighthGrader || !isFaschingTicket;

                    return (
                      <tr key={idx} className={rowColor}>
                        <td className="font-bold">
                          {cust.firstname} {cust.lastname}
                        </td>
                        <td>{cust.email}</td>
                        <td>{cust.paperTicket || '—'}</td>
                        <td>
                          {cust.paperTicket === 'external-guest'
                            ? (cust.guestSchoolName || '—')
                            : '—'
                          }
                        </td>
                        <td>
                          {cust.paperTicket === 'external-guest'
                            ? (cust.guestExternalGrade || '—')
                            : '—'
                          }
                        </td>
                        <td>{cust.ticketToken}</td>
                        <td>{cust.ticketCode || '—'}</td>
                        <td>{cust.ticket_type || '—'}</td>
                        <td>{cust.createdAt}</td>
                        <td>{getFaschingEntryStatus(cust)}</td>
                        <td>
                          {/* "Добави афтър" => модал */}
                          {isFaschingTicket && (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={disableAddAfter}
                              onClick={() => openAddAfterModal(cust)}
                            >
                              Добави афтър
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // ********** Таблица за НЕ-фашинг **********
              <table className="table w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th>Име</th>
                    <th>Имейл</th>
                    <th>Гости</th>
                    <th>Хартиен билет</th>
                    <th>Продавач</th>
                    <th>Дата/час</th>
                    <th></th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((cust, idx) => (
                    <tr key={idx} className={cust.reservation ? 'bg-blue-100' : ''}>
                      <td></td>
                      <td className={cust.isEntered ? 'font-bold text-yellow-600' : 'font-bold'}>
                        {cust.firstname} {cust.lastname}
                      </td>
                      <td>{cust.email}</td>
                      <td>{cust.guestCount}</td>
                      <td>{cust.paperTicket || 'няма'}</td>
                      <td>{cust.sellerName} ({cust.sellerEmail})</td>
                      <td>{cust.createdAt}</td>
                      <td>
                        <Link
                          href={`https://tickets.eventify.bg/${cust.ticketToken}`}
                          target="_blank"
                          className="btn btn-ghost btn-xs text-black"
                        >
                          <svg
                            height="24"
                            viewBox="0 0 1792 1792"
                            width="24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1024 452l316 316-572 572-316-316zm-211 979l618-618q19-19 19-45t-19-45l-362-362q-18-18-45-18t-45 
                              18l-618 618q-19 19-19 45t19 45l362 362q18 18 45 18t45-18zm889-637l-907 908q-37 37-90.5 
                              37t-90.5-37l-126-126q56-56 56-136t-56-136-136-56-136 
                              56l-125-126q-37-37-37-90.5t37-90.5l907-906q37-37 
                              90.5-37t90.5 37l125 125q-56 56-56 136t56 136 136 
                              56 136-56l126 125q37 37 37 90.5t-37 90.5z"
                              fill="currentColor"
                            />
                          </svg>
                        </Link>
                      </td>
                      <td>
                        <TicketActionsBtn
                          ticketToken={cust.ticketToken}
                          eventId={eventId}
                          onEnteredOrExited={fetchUsers}
                        />
                      </td>
                      <td>
                        <TicketDeactivateBtn
                          customerUuid={cust.uuid}
                          disabled={!cust.sellerCurrent && isSeller}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Модал за "Добави афтър" */}
      {isAddAfterModalOpen && currentTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={closeAddAfterModal}
            >
              <svg viewBox="0 0 384 512" width="16" fill="currentColor">
                <path d="M310.6 361.4c12.5 12.5 
                12.5 32.8 0 
                45.3s-32.8 12.5-45.3 
                0L192 333.3l-73.4 73.4c-12.5 
                12.5-32.8 12.5-45.3 
                0s-12.5-32.8 
                0-45.3l73.4-73.4-73.4-73.4c-12.5-12.5-12.5-32.8
                0-45.3s32.8-12.5 45.3 0l73.4 
                73.4 73.4-73.4c12.5-12.5 
                32.8-12.5 45.3 0s12.5 32.8 0 
                45.3L237.3 288l73.3 73.4z"/>
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-4">Добави афтър</h2>
            <p className="mb-2">
              Клиент: <strong>{currentTicket.firstname} {currentTicket.lastname}</strong>
            </p>
            <p className="mb-4">
              Трябва да се доплати <strong>{upgradeCost} лв.</strong>
            </p>

            {addAfterError && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
                {addAfterError}
              </div>
            )}
            {addAfterSuccessMsg && (
              <div className="bg-green-100 text-green-700 p-2 rounded mb-2">
                {addAfterSuccessMsg}{" "}
                {change > 0 && (
                  <span>Ресто: <strong>{change}</strong> лв.</span>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block font-medium mb-1">Получена сума (лв.):</label>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="input input-bordered w-full"
                // Disable input if success or while loading
                disabled={!!addAfterSuccessMsg || isUpgrading}
              />
            </div>

            {!addAfterSuccessMsg && (
              <button
                onClick={handleConfirmAddAfter}
                className="btn btn-success w-full"
                // disable the button if loading
                disabled={isUpgrading}
              >
                {isUpgrading ? "Зареждане..." : "Потвърди"}
              </button>
            )}
            {addAfterSuccessMsg && (
              <button
                onClick={closeAddAfterModal}
                className="btn btn-primary w-full"
              >
                Затвори
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;

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
  isEnteredFasching?: boolean;
  isEnteredAfter?: boolean;
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

  // Проверка дали е Fasching
  const isFasching = (eventId === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

  // ----- (НЕ-фашинг) статистики ------
  const totalTickets = users.length; // всички
  const paidTickets = users.filter(u => !u.reservation).length;
  const reservations = users.filter(u => u.reservation).length;
  const enteredCount = users.filter(u => u.isEntered).length;

  // ----- (Фашинг) статистики ------
  // По условие:
  // Fasching = 10 лв
  // Fasching + After = 25 лв (10 + 15)
  // Искаме:
  //  - Платени fasching / платени fasching+after
  //  - Приход от fasching portion + after portion
  //  - Влизания

  let faschingOnlyCount = 0;
  let faschingAfterCount = 0;

  let paidF = 0;  // платени Fasching
  let paidFA = 0; // платени Fasching+After

  let enteredFasching = 0;
  let enteredAfter = 0;
  let enteredBoth = 0;

  if (isFasching) {
    faschingOnlyCount = users.filter(u => u.ticket_type === "fasching").length;
    faschingAfterCount = users.filter(u => u.ticket_type === "fasching-after").length;

    paidF = users.filter(u => u.ticket_type === "fasching" && !u.reservation).length;
    paidFA = users.filter(u => u.ticket_type === "fasching-after" && !u.reservation).length;

    enteredFasching = users.filter(u => u.isEnteredFasching).length;
    enteredAfter = users.filter(u => u.isEnteredAfter).length;
    enteredBoth = users.filter(u => u.isEnteredFasching && u.isEnteredAfter).length;
  }

  // Приходи:
  // Fasching portion = 10 * (всички платени: paidF + paidFA)
  // After portion = 15 * paidFA
  // Общо = 10*(paidF+paidFA) + 15*paidFA = 10*paidF + 25*paidFA
  const faschingPortionRevenue = 10 * (paidF + paidFA);
  const afterPortionRevenue = 15 * paidFA;
  const totalFaschingRevenue = faschingPortionRevenue + afterPortionRevenue;

  // ----------------------------------------------
  // МОДАЛ за "Добави афтър"
  // ----------------------------------------------
  const [isAddAfterModalOpen, setAddAfterModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Customer | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [addAfterError, setAddAfterError] = useState<string>('');
  const [addAfterSuccessMsg, setAddAfterSuccessMsg] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  const openAddAfterModal = (ticket: Customer) => {
    setCurrentTicket(ticket);
    setPaidAmount('');
    setChange(0);
    setAddAfterError('');
    setAddAfterSuccessMsg('');
    setAddAfterModalOpen(true);
  };

  const closeAddAfterModal = () => {
    setAddAfterModalOpen(false);
    setCurrentTicket(null);
  };

  const handleConfirmAddAfter = async () => {
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
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setAddAfterError("Неуспешен ъпгрейд.");
    } finally {
      setIsUpgrading(false);
    }
  };

  // ----------------------------------------------
  // Зареждане на данни
  // ----------------------------------------------
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const userResponse = await getUsers(eventId);
      //@ts-ignore
      setUsers(userResponse);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

  const fetchTombolaPrice = async () => {
    try {
      const data = await getCurrentTombolaPrice({ eventUuid: eventId });
      setTombolaPrice(data.tombolaPrice || '');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (!isFasching) {
      fetchLimit();
      fetchTombolaPrice();
    }
  }, [eventId, isFasching]);

  // Филтриране
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const tmp = users.filter(u => {
      const fullName = (u.firstname + " " + u.lastname).toLowerCase();
      const extra = [
        u.email,
        u.paperTicket,
        u.sellerName,
        u.sellerEmail,
        u.ticketCode,
        u.ticket_type,
        u.ticketToken,
      ]
        .map(x => x || "")
        .join(" ")
        .toLowerCase();

      return (fullName + " " + extra).includes(lower);
    });

    setFilteredUsers(tmp);
  }, [searchTerm, users]);

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
      console.error(err);
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
      console.error(err);
    } finally {
      setLimitLoading(false);
    }
  };

  if (error) {
    return <p className="text-red-500">Error: {error.message}</p>;
  }

  return (
    <div className="bg-white shadow rounded p-4 text-black">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h2 className="text-xl font-semibold">Билети</h2>
        <div className="flex gap-2">
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

      {/* Настройки (само при не-Fasching и ако не е seller) */}
      {!isFasching && !isSeller && (
        <div className="flex flex-col gap-2 mb-4">
          <form onSubmit={(e) => { e.preventDefault(); handleLimitSubmit(); }}>
            <label className="block mb-1 text-sm font-medium">Лимит на билетите:</label>
            <input
              type="number"
              min={0}
              value={limit || ""}
              onChange={handleLimitChange}
              className="input input-bordered w-full max-w-xs"
              placeholder="Остави празно, ако няма лимит"
            />
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={!isLimitChanged || limitLoading}
            >
              {limitLoading ? "..." : "Запиши"}
            </button>
          </form>

          <form onSubmit={(e) => { e.preventDefault(); handleTombolaPriceSubmit(); }}>
            <label className="block mb-1 text-sm font-medium">Цена на томбола:</label>
            <input
              type="number"
              min={0}
              value={tombolaPrice || ""}
              onChange={handleTombolaPriceChange}
              className="input input-bordered w-full max-w-xs"
              placeholder="Остави празно, ако няма"
            />
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={!isTombolaPriceChanged || limitLoading}
            >
              {limitLoading ? "..." : "Запиши"}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <p>Зареждане...</p>
      ) : (
        <>
          {/* Бутон "Изпрати имейл до всички" (само при не-Fasching и не-seller) */}
          {!isFasching && !isSeller && (
            <div className="mb-4">
              <SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} />
            </div>
          )}

          {/* Ако е Fasching => правим статистиките на 3 групи: Ticket Stats, Revenue Stats, Check-in Stats */}
          {isFasching && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2 text-sm">Статистики за билети</h4>
                <ul className="text-sm space-y-1">
                  <li>Общо билети: {totalTickets}</li>
                  <li>Платени: {paidTickets}</li>
                  <li>Резервации: {reservations}</li>
                  <br></br>
                  <li>Само фашинг: {faschingOnlyCount}</li>
                  <li>Афтър+Фашинг: {faschingAfterCount}</li>
                </ul>
              </div>

              <div className="p-3 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2 text-sm">Статистики за печалба</h4>
                <ul className="text-sm space-y-1">
                  <li>Фашинг: {faschingPortionRevenue} лв</li>
                  <li>Афтър: {afterPortionRevenue} лв</li>
                  <li className="font-semibold">
                    Общо: {totalFaschingRevenue} лв
                  </li>
                </ul>
              </div>

              <div className="p-3 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2 text-sm">Статистики за влезли в събитието</h4>
                <ul className="text-sm space-y-1">
                  <li>Влезли (Фашинг): {enteredFasching}</li>
                  <li>Влезли (Афтър): {enteredAfter}</li>
                  <li>Влезли (И двете): {enteredBoth}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Ако не е Fasching => някаква по-стандартна статистика */}
          {!isFasching && (
            <div className="mb-4 p-3 border rounded bg-gray-50 text-sm">
              <ul className="space-y-1">
                <li>Общо билети: {totalTickets}</li>
                <li>Платени: {paidTickets}</li>
                <li>Резервации: {reservations}</li>
                <li>Влезли: {enteredCount}</li>
              </ul>
            </div>
          )}

          {/* Търсачка */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Търси по име/имейл..."
              className="input input-bordered w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Таблица на билетите */}
          <div className="overflow-x-auto">
            {isFasching ? (
              // ---------- ФАШИНГ ТАБЛИЦА -----------
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
                    <th>Опции</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((cust, idx) => {
                    // Цветово маркираме реда
                    let rowClass = '';
                    if (cust.reservation) {
                      rowClass = 'bg-red-100'; // неплатен
                    } else if (cust.isEnteredFasching && cust.isEnteredAfter) {
                      rowClass = 'bg-purple-100'; // влязъл и на двете
                    } else if (cust.isEnteredFasching) {
                      rowClass = 'bg-green-100'; // влязъл на фашинг
                    } else if (cust.isEnteredAfter) {
                      rowClass = 'bg-blue-100'; // влязъл на афтър
                    }

                    // Статус
                    let statusLabel = 'Платен, но не е влязъл';
                    if (cust.reservation) {
                      statusLabel = 'Неплатен (резервация)';
                    } else {
                      const f = cust.isEnteredFasching;
                      const a = cust.isEnteredAfter;
                      if (f && a) statusLabel = 'Влязъл (F + After)';
                      else if (f) statusLabel = 'Влязъл (Fasching)';
                      else if (a) statusLabel = 'Влязъл (After)';
                    }

                    // Логика за бутона „Добави After“
                    const isFaschingTicket = (cust.ticket_type === "fasching");
                    const disableAddAfter = cust.reservation || !isFaschingTicket;

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className="font-semibold">
                          {cust.firstname} {cust.lastname}
                        </td>
                        <td>{cust.email}</td>
                        <td>{cust.paperTicket || '—'}</td>
                        <td>
                          {cust.paperTicket === 'external-guest'
                            ? (cust.guestSchoolName || '—')
                            : '—'}
                        </td>
                        <td>
                          {cust.paperTicket === 'external-guest'
                            ? (cust.guestExternalGrade || '—')
                            : '—'}
                        </td>
                        <td>{cust.ticketToken || '—'}</td>
                        <td>{cust.ticketCode || '—'}</td>
                        <td>{cust.ticket_type || '—'}</td>
                        <td>{cust.createdAt}</td>
                        <td>{statusLabel}</td>
                        <td>
                          {isFaschingTicket && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openAddAfterModal(cust)}
                              disabled={disableAddAfter}
                            >
                              Добави After
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // ---------- НЕ-ФАШИНГ ТАБЛИЦА -----------
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
                      <td>{cust.paperTicket || '—'}</td>
                      <td>
                        {cust.sellerName
                          ? `${cust.sellerName} (${cust.sellerEmail})`
                          : '—'
                        }
                      </td>
                      <td>{cust.createdAt}</td>
                      <td>
                        <Link
                          href={`https://tickets.eventify.bg/${cust.ticketToken}`}
                          target="_blank"
                          className="btn btn-ghost btn-xs text-black"
                        >
                          Преглед
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

      {/* Модал: „Добави After“ */}
      {isAddAfterModalOpen && currentTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
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

            <h2 className="text-xl font-bold mb-3">Ъпгрейд до "Fasching+After"</h2>
            <p className="mb-3">
              Клиент: <strong>{currentTicket.firstname} {currentTicket.lastname}</strong>
            </p>
            <p className="mb-3">
              Доплащане: <strong>15 лв.</strong>
            </p>

            {addAfterError && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
                {addAfterError}
              </div>
            )}

            {addAfterSuccessMsg && (
              <div className="bg-green-100 text-green-700 p-2 rounded mb-2">
                {addAfterSuccessMsg}{" "}
                {change > 0 && <span>Ресто: {change} лв.</span>}
              </div>
            )}

            {!addAfterSuccessMsg && (
              <>
                <label className="block mb-1 text-sm font-medium">Получена сума (лв):</label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="input input-bordered w-full mb-3"
                  disabled={isUpgrading}
                />
                <button
                  onClick={handleConfirmAddAfter}
                  className="btn btn-success w-full"
                  disabled={isUpgrading}
                >
                  {isUpgrading ? "..." : "Потвърди"}
                </button>
              </>
            )}

            {addAfterSuccessMsg && (
              <button onClick={closeAddAfterModal} className="btn btn-primary w-full">
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

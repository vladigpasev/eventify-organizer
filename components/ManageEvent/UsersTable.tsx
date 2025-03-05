"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import TicketActionsBtn from "@/components/ManageEvent/TicketActionsBtn";
import TicketDeactivateBtn from "@/components/ManageEvent/TicketDeactivateBtn";
import { getUsers } from "@/server/events/getUsers";

import AddCustomer from "./AddCustomer";
import CheckTicket from "./CheckTickets";
import SendEmailToAll from "./SendEmailToAll";

import { getCurrentLimit, changeLimit } from "@/server/events/limit";
import { getCurrentTombolaPrice, changeTombolaPrice } from "@/server/events/tombola_price";
import { confirmAddAfterUpgrade } from "@/server/fasching/faschingActions";
import { getFaschingStats, getTicketVotes } from "@/server/fasching/faschingStats";

// ---------------------------
// Interfaces
// ---------------------------
interface UserTableProps {
  eventId: string;
  isSeller: boolean | undefined;
  userUuid: string;
  // Нов проп: дали текущият user е Fasching Admin
  isFaschingAdmin: boolean;
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
  votedAt?: string | null;

  // Ново поле
  hiddenafter?: boolean;
}

interface UserVote {
  categoryTitle: string;
  nomineeName: string;
}

interface NomineeStat {
  nomineeId: string;
  nomineeName: string;
  votes: number;
}

export default function UserTable({
  eventId,
  isSeller,
  userUuid,
  isFaschingAdmin,
}: UserTableProps) {
  const [users, setUsers] = useState<Customer[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Limit & tombola
  const [limit, setLimit] = useState<string | null>(null);
  const [limitLoading, setLimitLoading] = useState<boolean>(false);
  const [isLimitChanged, setIsLimitChanged] = useState<boolean>(false);

  const [tombolaPrice, setTombolaPrice] = useState<string | null>(null);
  const [isTombolaPriceChanged, setIsTombolaPriceChanged] = useState<boolean>(false);

  // Is Fasching?
  const isFasching = eventId === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d";

  // --------------------
  // Основни статистики
  // --------------------
  const totalTickets = users.length;
  const paidTickets = users.filter(u => !u.reservation).length;
  const reservations = users.filter(u => u.reservation).length;
  const enteredCount = users.filter(u => u.isEntered).length;

  // --------------------
  // Fasching статистики
  // --------------------
  let faschingOnlyCount = 0;
  let faschingAfterCount = 0;
  let paidF = 0;
  let paidFA = 0;
  let enteredFasching = 0;
  let enteredAfter = 0;
  let enteredBoth = 0;

  if (isFasching) {
    // Определяме дали да броим билета като fasching или fasching-after
    // ако ticket_type === "fasching-after" И hiddenafter = true, го броим като fasching
    const isFaschingTicket = (u: Customer) =>
      u.ticket_type === "fasching" ||
      (u.ticket_type === "fasching-after" && u.hiddenafter === true);

    const isFaschingAfterTicket = (u: Customer) =>
      u.ticket_type === "fasching-after" && !u.hiddenafter;

    faschingOnlyCount = users.filter(isFaschingTicket).length;
    faschingAfterCount = users.filter(isFaschingAfterTicket).length;

    paidF = users.filter(u => isFaschingTicket(u) && !u.reservation).length;
    paidFA = users.filter(u => isFaschingAfterTicket(u) && !u.reservation).length;

    enteredFasching = users.filter(u => u.isEnteredFasching).length;
    enteredAfter = users.filter(u => u.isEnteredAfter).length;
    enteredBoth = users.filter(u => u.isEnteredFasching && u.isEnteredAfter).length;
  }

  // Примерни изчисления за приходи (Fasching)
  // Fasching portion = 10 лв, After portion = 15 лв
  const faschingPortionRevenue = 10 * (paidF + paidFA);  // paidF включва всички F и hiddenAfter
  const afterPortionRevenue = 15 * paidFA;               // само не-hidden after
  const totalFaschingRevenue = faschingPortionRevenue + afterPortionRevenue;

  // ---------------
  // Add After Modal
  // ---------------
  const [isAddAfterModalOpen, setAddAfterModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Customer | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [addAfterError, setAddAfterError] = useState<string>("");
  const [addAfterSuccessMsg, setAddAfterSuccessMsg] = useState<string>("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  function openAddAfterModal(ticket: Customer) {
    setCurrentTicket(ticket);
    setPaidAmount("");
    setChange(0);
    setAddAfterError("");
    setAddAfterSuccessMsg("");
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
  }

  // ---------------
  // Stats Modal
  // ---------------
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [faschingStats, setFaschingStats] = useState<Record<string, NomineeStat[]>>({});

  async function handleOpenStatsModal() {
    setStatsModalOpen(true);
    try {
      setStatsLoading(true);
      // Предаваме дали е FaschingAdmin. Ако не е, функцията ще хвърли грешка.
      const data = await getFaschingStats({ userIsAdmin: isFaschingAdmin });
      setFaschingStats(data);
    } catch (err) {
      console.error("Failed to load Fasching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }
  function handleCloseStatsModal() {
    setStatsModalOpen(false);
  }

  // ---------------
  // See Answers Modal
  // ---------------
  const [answersModalOpen, setAnswersModalOpen] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answers, setAnswers] = useState<UserVote[]>([]);
  const [answersError, setAnswersError] = useState("");

  async function openAnswersModal(cust: Customer) {
    setAnswersError("");
    setAnswers([]);
    setAnswersModalOpen(true);

    if (!cust.votedAt) {
      setAnswersError("Потребителят не е гласувал.");
      return;
    }
    // Ако не сме админ – директно показваме грешка
    if (!isFaschingAdmin) {
      setAnswersError("Нямате права да видите за кого е гласувал потребителят.");
      return;
    }

    try {
      setAnswersLoading(true);
      const ticketId = parseInt(cust.uuid, 10);
      if (isNaN(ticketId)) {
        setAnswersError("Невалиден ticketId");
        return;
      }
      // Извикваме getTicketVotes с userIsAdmin
      const votes = await getTicketVotes(ticketId, { userIsAdmin: isFaschingAdmin });
      setAnswers(votes);
    } catch (err: any) {
      console.error(err);
      setAnswersError(err?.message || "Error fetching user votes.");
    } finally {
      setAnswersLoading(false);
    }
  }
  function closeAnswersModal() {
    setAnswersModalOpen(false);
  }

  // ---------------
  // Data fetching
  // ---------------
  async function fetchUsers() {
    try {
      setIsLoading(true);
      const userResponse = await getUsers(eventId);
      setUsers(userResponse as Customer[]);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }
  async function fetchLimit() {
    try {
      const data = await getCurrentLimit({ eventUuid: eventId });
      setLimit(data.limit || "");
    } catch (err) {
      console.error("Error fetching limit:", err);
    }
  }
  async function fetchTombolaPrice() {
    try {
      const data = await getCurrentTombolaPrice({ eventUuid: eventId });
      setTombolaPrice(data.tombolaPrice || "");
    } catch (err) {
      console.error("Error fetching tombola price:", err);
    }
  }

  useEffect(() => {
    fetchUsers();
    if (!isFasching) {
      fetchLimit();
      fetchTombolaPrice();
    }
  }, [eventId, isFasching]);

  // Searching & sorting
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const tmp = users.filter(u => {
      const fullName = (u.firstname + " " + u.lastname).toLowerCase();
      const sellerFull = (u.sellerName || "") + " " + (u.sellerEmail || "");
      const combined = [
        fullName,
        u.email.toLowerCase(),
        (u.paperTicket || "").toLowerCase(),
        sellerFull.toLowerCase(),
        (u.ticketCode || "").toLowerCase(),
        (u.ticket_type || "").toLowerCase(),
        (u.ticketToken || "").toLowerCase(),
      ].join(" ");
      return combined.includes(lower);
    });

    if (isFasching) {
      const classesOrder = [
        "8а", "8б", "8в", "8г", "8д", "8е", "8ж",
        "9а", "9б", "9в", "9г", "9д", "9е", "9ж",
        "10а", "10б", "10в", "10г", "10д", "10е", "10ж",
        "11а", "11б", "11в", "11г", "11д", "11е", "11ж",
        "12а", "12б", "12в", "12г", "12д", "12е", "12ж",
      ];
      function getPriority(c: Customer) {
        const cg = c.paperTicket || "";
        const idx = classesOrder.indexOf(cg);
        if (idx >= 0) return idx;
        if (cg === "external-guest") {
          const gradeNum = Number(c.guestExternalGrade);
          if (!isNaN(gradeNum) && gradeNum >= 8 && gradeNum <= 12) {
            return 100 + (gradeNum - 8);
          }
          return 105;
        }
        if (cg === "adult") return 200;
        if (cg === "teacher") return 300;
        return 999;
      }
      tmp.sort((a, b) => {
        const pa = getPriority(a);
        const pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        const nameA = (a.firstname + a.lastname).toLowerCase();
        const nameB = (b.firstname + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      tmp.sort((a, b) => {
        const nameA = (a.firstname + a.lastname).toLowerCase();
        const nameB = (b.firstname + b.lastname).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    setFilteredUsers(tmp);
  }, [searchTerm, users, isFasching]);

  // Limit/tombola
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
      console.error("Error changing limit:", err);
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
      console.error("Error changing tombola price:", err);
    } finally {
      setLimitLoading(false);
    }
  };

  if (error) {
    return <p className="text-red-500">Грешка при зареждане: {error.message}</p>;
  }

  function getFaschingRowColor(c: Customer) {
    if (c.reservation) return c.expiresSoon ? "bg-red-200" : "bg-red-100";
    if (c.isEnteredFasching && c.isEnteredAfter) return "bg-purple-100";
    if (c.isEnteredFasching) return "bg-green-100";
    if (c.isEnteredAfter) return "bg-blue-100";
    return "";
  }
  function getFaschingStatusLabel(c: Customer) {
    if (c.reservation) {
      return c.expiresSoon ? "Неплатен (резервация) ❗" : "Неплатен (резервация)";
    }
    if (c.isEnteredFasching && c.isEnteredAfter) return "Влязъл (F + After)";
    if (c.isEnteredFasching) return "Влязъл (Fasching)";
    if (c.isEnteredAfter) return "Влязъл (After)";
    return "Платен, но не е влязъл";
  }

  return (
    <div className="bg-white shadow rounded p-4 text-black relative">
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

      {!isFasching && !isSeller && (
        <div className="flex flex-col gap-2 mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLimitSubmit();
            }}
          >
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTombolaPriceSubmit();
            }}
          >
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
          {/* Ако не е Fasching и не е seller, показваме бутона за масово изпращане */}
          {!isFasching && !isSeller && (
            <div className="mb-4">
              <SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} />
            </div>
          )}

          {/* Статистика за нормални събития */}
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

          {/* Статистика за Fasching */}
          {isFasching && (
            <div className="mb-4 p-3 border rounded bg-gray-50 text-sm space-y-1">
              <p>Общо билети: {totalTickets}</p>
              <p>Платени: {paidTickets}</p>
              <p>Резервации: {reservations}</p>
              <p>Fasching: {faschingOnlyCount}</p>
              <p>Fasching+After: {faschingAfterCount}</p>
              <p className="mt-2 font-medium">Приходи: {totalFaschingRevenue} лв</p>

              {/* Бутонът за статистики се вижда само за Fasching Admin */}
              {isFaschingAdmin && (
                <button className="btn btn-secondary mt-3" onClick={handleOpenStatsModal}>
                  Виж статистики
                </button>
              )}
            </div>
          )}

          {/* Търсене */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Търси по име/имейл..."
              className="input input-bordered w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Таблица с билети */}
          <div className="overflow-x-auto">
            {isFasching ? (
              <table className="table table-auto w-full border rounded">
                <thead className="bg-gray-200">
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
                    <th>Гласувал?</th>
                    {isFaschingAdmin && <th>Отговори</th>}
                    <th>Опции</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((cust, idx) => {
                    const rowClass = getFaschingRowColor(cust);
                    const statusLabel = getFaschingStatusLabel(cust);

                    // 1) Проверяваме дали билетът е неплатен
                    const isUnpaid = cust.reservation === true;
                    // 2) Ако е истински After (не hidden), вече няма какво да ъпгрейдваме
                    const isRealAfter = (cust.ticket_type === "fasching-after" && !cust.hiddenafter);
                    // 3) Осмокласници (по ваша политика)
                    const isEighthGrade = ["8а", "8б", "8в", "8г", "8д", "8е", "8ж"].includes(cust.paperTicket || "");

                    // Бутонът е неактивен само ако билетът е неплатен, 
                    // или вече е "fasching-after" реален (не hidden), 
                    // или е осмокласник
                    const disableAddAfter = isUnpaid || isRealAfter || isEighthGrade;

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className="font-semibold">
                          {cust.firstname} {cust.lastname}
                        </td>
                        <td>{cust.email}</td>
                        <td>{cust.paperTicket || "—"}</td>
                        <td>
                          {cust.paperTicket === "external-guest"
                            ? cust.guestSchoolName || "—"
                            : "—"}
                        </td>
                        <td>
                          {cust.paperTicket === "external-guest"
                            ? cust.guestExternalGrade || "—"
                            : "—"}
                        </td>
                        <td>{cust.ticketToken || "—"}</td>
                        <td>{cust.ticketCode || "—"}</td>
                        <td>
                          {cust.ticket_type}
                          {cust.hiddenafter && cust.ticket_type === "fasching-after" && (
                            <span className="ml-1 text-xs text-gray-600">()</span>
                          )}
                        </td>
                        <td>{cust.createdAt}</td>
                        <td>{statusLabel}</td>
                        <td className="text-center">{cust.votedAt ? "Да" : "Не"}</td>

                        {/* Ако е Fasching Admin -> показваме бутон "Отговори" за гласуване */}
                        {isFaschingAdmin && (
                          <td>
                            <button
                              className="btn btn-sm btn-info"
                              disabled={!cust.votedAt}
                              onClick={() => openAnswersModal(cust)}
                            >
                              Отвори
                            </button>
                          </td>
                        )}

                        <td>
                          {/* Бутонът се вижда само, ако Е "fasching" или "fasching-after" HIDDEN => т.е. все едно Fasching */}
                          {(cust.ticket_type === "fasching" ||
                            (cust.ticket_type === "fasching-after" && cust.hiddenafter)) && (
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={disableAddAfter}
                                onClick={() => openAddAfterModal(cust)}
                              >
                                Add After
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            ) : (
              <table className="table table-auto w-full border rounded">
                <thead className="bg-gray-200">
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
                    <tr key={idx} className={cust.reservation ? "bg-blue-100" : ""}>
                      <td></td>
                      <td
                        className={
                          cust.isEntered
                            ? "font-bold text-yellow-600"
                            : "font-bold"
                        }
                      >
                        {cust.firstname} {cust.lastname}
                      </td>
                      <td>{cust.email}</td>
                      <td>{cust.guestCount}</td>
                      <td>{cust.paperTicket || "—"}</td>
                      <td>
                        {cust.sellerName
                          ? `${cust.sellerName} (${cust.sellerEmail})`
                          : "—"}
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

      {/* Add After Modal */}
      <AnimatePresence>
        {isAddAfterModalOpen && currentTicket && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[80vh] overflow-y-auto"
              initial={{ y: -50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                onClick={closeAddAfterModal}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-4">Ъпгрейд до "Fasching+After"</h2>
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
                  {addAfterSuccessMsg} {change > 0 && <span>Ресто: {change} лв</span>}
                </div>
              )}

              {!addAfterSuccessMsg && (
                <>
                  <label className="block mb-1 text-sm font-medium">
                    Получена сума (лв):
                  </label>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* See Answers Modal */}
      <AnimatePresence>
        {answersModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[80vh] overflow-y-auto"
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                onClick={closeAnswersModal}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-4">Гласове на потребителя</h2>
              {answersError && (
                <div className="bg-red-100 text-red-700 p-2 rounded mb-3">
                  {answersError}
                </div>
              )}
              {answersLoading ? (
                <p>Зареждане...</p>
              ) : answers.length === 0 && !answersError ? (
                <p>Няма намерени гласове.</p>
              ) : (
                <table className="table table-auto w-full border rounded text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2">Категория</th>
                      <th className="p-2">Номиниран</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((a, i) => (
                      <tr key={i} className="border-b last:border-none">
                        <td className="p-2">{a.categoryTitle}</td>
                        <td className="p-2">{a.nomineeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button onClick={closeAnswersModal} className="btn btn-primary mt-4 w-full">
                Затвори
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto"
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                onClick={handleCloseStatsModal}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-4 text-center">
                Fasching - Резултати от гласуването
              </h2>

              {statsLoading ? (
                <p className="text-center">Зареждане на статистиките...</p>
              ) : Object.keys(faschingStats).length === 0 ? (
                <p className="text-center">Все още няма гласове</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(faschingStats).map(([categoryTitle, items]) => {
                    const maxVotes = items.reduce(
                      (acc, cur) => Math.max(acc, cur.votes),
                      0
                    );

                    return (
                      <div
                        key={categoryTitle}
                        className="border rounded-lg p-4 bg-gray-50 shadow-sm"
                      >
                        <h3 className="font-semibold text-lg mb-3 text-purple-700 break-words">
                          Категория: <span className="underline">{categoryTitle}</span>
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto text-sm border-collapse">
                            <thead>
                              <tr className="border-b bg-gray-200">
                                <th className="p-2 text-left">Номиниран</th>
                                <th className="p-2 text-left">Гласове</th>
                                <th className="p-2 w-full">Прогрес</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((nom, i) => {
                                const barWidth =
                                  maxVotes === 0 ? 0 : (nom.votes / maxVotes) * 100;
                                return (
                                  <tr
                                    key={nom.nomineeId}
                                    className="border-b last:border-none"
                                  >
                                    <td className="p-2">
                                      {/* Показваме (Winner!) само за първия в списъка */}
                                      {i === 0 && (
                                        <span className="font-bold text-green-600 mr-1">
                                          (Winner!)
                                        </span>
                                      )}
                                      {nom.nomineeName}
                                    </td>
                                    <td className="p-2">{nom.votes}</td>
                                    <td className="p-2">
                                      <div className="bg-gray-300 rounded-full h-3 w-full">
                                        <motion.div
                                          className="bg-blue-500 h-3 rounded-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${barWidth}%` }}
                                          transition={{ duration: 0.4 }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleCloseStatsModal}
                className="btn btn-primary mt-4 w-full"
              >
                Затвори
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

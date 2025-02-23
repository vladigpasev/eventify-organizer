"use client"

import React, { useState, useEffect } from 'react';
import { createManualTicket } from '@/server/events/tickets/generate';
import { checkAuthenticated } from '@/server/auth';
import { checkPaperToken } from '@/server/events/tickets/check_paper';
import { useRouter } from 'next/navigation';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { verifyFaschingCode, confirmFaschingPayment } from '@/server/fasching/faschingActions';
import { motion, AnimatePresence } from 'framer-motion';

interface AddCustomerProps {
  eventId: string;
  onCustomerAdded: () => void;
  userUuid: string;          // <--- съдържа идентификатора (sellerId), който искаме да пращаме
  buttonLabel?: string;
}

function AddCustomer({
  eventId,
  onCustomerAdded,
  userUuid,
  buttonLabel
}: AddCustomerProps) {

  const isFasching = eventId === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d";
  const router = useRouter();

  const [isModalOpen, setModalOpen] = useState(false);

  // ---- Не-фашинг (хартиени билети) ----
  const [paperTicketAccessToken, setPaperTicketAccessToken] = useState<string|null>(null);
  const [nineDigitCode, setNineDigitCode] = useState<string|null>(null);
  const [isQrScannerOpen, setQrScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ---- Фашинг променливи ----
  const [paymentCode, setPaymentCode] = useState(''); 
  const [faschingOrder, setFaschingOrder] = useState<any>(null);
  const [faschingTickets, setFaschingTickets] = useState<any[]>([]);
  const [faschingCount, setFaschingCount] = useState(0);
  const [faschingAfterCount, setFaschingAfterCount] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  // За да показваме "Зареждане..." на бутона "Потвърди плащането"
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // „Ръчно въвеждане“ или „QR скенер“
  const [isManualEntry, setIsManualEntry] = useState<boolean>(
    isFasching ? false : false
  );

  useEffect(() => {
    if (isFasching && isModalOpen && !isManualEntry) {
      setQrScannerOpen(true);
    }
  }, [isFasching, isModalOpen, isManualEntry]);

  /**
   * Отваряне/затваряне на модала + нулиране
   */
  const toggleModal = async () => {
    const isAuthenticated = await checkAuthenticated();
    if (!isAuthenticated) {
      router.refresh();
      alert('Your session is expired. Please refresh the page to sign in again.');
      return;
    }

    if (isModalOpen) {
      // Затваряме => нулираме
      setPaperTicketAccessToken(null);
      setNineDigitCode(null);
      setErrorMessage('');
      setPaymentCode('');
      setFaschingOrder(null);
      setFaschingTickets([]);
      setFaschingCount(0);
      setFaschingAfterCount(0);
      setTotalDue(0);
      setPaidAmount('');
      setShowPaymentSuccess(false);
      setChangeAmount(0);
      setIsPaymentLoading(false);

      setIsManualEntry(isFasching ? false : false);
      setQrScannerOpen(false);
    }
    setModalOpen(!isModalOpen);
  };

  // -----------------------------
  // ЛОГИКА ЗА НЕ-ФАШИНГ
  // -----------------------------
  const handleQrScan = async (result: string) => {
    if (result) {
      try {
        // Ако е не-фашинг
        const response = await checkPaperToken({ eventUuid: eventId, token: result });
        if (response.success) {
          setPaperTicketAccessToken(result);
          setNineDigitCode(response.currentCustomer?.nineDigitCode || null);
          setQrScannerOpen(false);
          setErrorMessage('');
        } else {
          setErrorMessage('Хартиеният билет е невалиден');
          setQrScannerOpen(false);
        }
      } catch (error) {
        console.error('Error during paper ticket verification:', error);
        setErrorMessage('Грешка при верификация на хартиения билет');
        setQrScannerOpen(false);
      }
    }
  };

  const handleQrError = (error: any) => {
    console.error('Camera error:', error);
    setQrScannerOpen(false);
    setErrorMessage('Възникна проблем с камерата. Уверете се, че сте в HTTPS/localhost и че сте разрешили достъп до камерата.');
  };

  const handleDeletePaperTicket = () => {
    setPaperTicketAccessToken(null);
    setNineDigitCode(null);
    setErrorMessage('');
  };

  // -----------------------------
  // ЛОГИКА ЗА ФАШИНГ
  // -----------------------------
  const checkFaschingCode = async (code: string) => {
    setFaschingOrder(null);
    setFaschingTickets([]);
    setFaschingCount(0);
    setFaschingAfterCount(0);
    setTotalDue(0);
    setShowPaymentSuccess(false);
    setChangeAmount(0);
    setErrorMessage('');

    if (!code || !code.startsWith('F')) {
      setErrorMessage('Моля въведете/сканирайте код, който започва с F');
      return;
    }
    try {
      const isAuthenticated = await checkAuthenticated();
      if (!isAuthenticated) {
        alert('Сесията ти е изтекла. Презареди страницата, за да влезеш отново.');
        router.refresh();
        return;
      }

      const resp = await verifyFaschingCode({ paymentCode: code });
      if (!resp.success) {
        setErrorMessage(resp.message || 'Невалиден код');
        return;
      }
      // Ако е успех:
      setFaschingOrder(resp.order);
      setFaschingTickets(resp.tickets || []);
      setFaschingCount(resp.faschingCount || 0);
      setFaschingAfterCount(resp.faschingAfterCount || 0);
      setTotalDue(resp.totalDue || 0);

    } catch (error) {
      console.error('Error checking fasching code:', error);
      setErrorMessage('Грешка при проверка на кода');
    }
  };

  const handleFaschingQrScan = async (scannedCode: string) => {
    setQrScannerOpen(false);
    setPaymentCode(scannedCode);
    await checkFaschingCode(scannedCode);
  };

  const handleCheckCode = async () => {
    await checkFaschingCode(paymentCode);
  };

  /**
   * При потвърждаване на плащането:
   * - Вече подаваме sellerId: userUuid
   * - Показваме loading в бутона
   */
  const handleConfirmPayment = async () => {
    if (!faschingOrder) return;
    if (!paidAmount) {
      setErrorMessage('Моля въведете сумата, която сте получили.');
      return;
    }
    const paidNum = parseFloat(paidAmount);
    if (isNaN(paidNum) || paidNum <= 0) {
      setErrorMessage('Невалидна сума.');
      return;
    }

    try {
      setIsPaymentLoading(true); // Започваме loading
      const isAuthenticated = await checkAuthenticated();
      if (!isAuthenticated) {
        setIsPaymentLoading(false);
        alert('Сесията ти е изтекла. Презареди страницата, за да влезеш отново.');
        router.refresh();
        return;
      }

      const resp = await confirmFaschingPayment({
        requestId: faschingOrder.id,
        paidAmount: paidNum,
        sellerId: userUuid,  // <--- подаваме sellerId тук
      });

      if (!resp.success) {
        setErrorMessage(resp.message || 'Неуспешно потвърждаване');
        setIsPaymentLoading(false);
        return;
      }
      setChangeAmount(resp.change ?? 0);
      setShowPaymentSuccess(true);
      onCustomerAdded();
    } catch (error) {
      console.error('Error confirming fasching payment:', error);
      setErrorMessage('Грешка при потвърждаване на плащането');
    } finally {
      setIsPaymentLoading(false); // Спираме loading
    }
  };

  const toggleFaschingScannerMode = () => {
    setIsManualEntry(!isManualEntry);
    setErrorMessage('');
    setPaymentCode('');
    setQrScannerOpen(!isManualEntry);
  };

  const formatTicketType = (type: string) => {
    if (type === 'fasching') {
      return '🎉 Фашинг';
    }
    if (type === 'fasching_after' || type === 'fasching-after') {
      return '🌃 Фашинг + Афтър';
    }
    return type; 
  };

  return (
    <div>
      <button 
        onClick={toggleModal} 
        className="btn bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={20} fill='currentColor'>
          <path d="M256 80c0-17.7-14.3-32-32-32s-32 
             14.3-32 32V224H48c-17.7 
             0-32 14.3-32 
             32s14.3 32 32 32H192V432c0 
             17.7 14.3 32 32 
             32s32-14.3 
             32-32V288H400c17.7 
             0 32-14.3 
             32-32s-14.3-32-32-32H256V80z" />
        </svg>
        {buttonLabel || "Създай билет"}
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white p-6 rounded-lg max-w-xl w-full relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 12 }}
            >
              {/* Бутон "X" */}
              <button onClick={toggleModal} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={16} fill='currentColor'>
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
                  45.3L237.3 288l73.3 73.4z" />
                </svg>
              </button>

              {isFasching ? (
                <div className="mt-2">
                  <h2 className="text-2xl mb-4 font-bold text-center text-gray-800">
                    Потвърждаване на плащане (Фашинг)
                  </h2>
                  {errorMessage && (
                    <div className="text-red-600 mb-2 font-semibold">
                      {errorMessage}
                    </div>
                  )}

                  <AnimatePresence>
                    {showPaymentSuccess && (
                      <motion.div
                        className="bg-green-100 border border-green-300 rounded p-3 mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                      >
                        <h3 className="text-green-800 font-semibold text-lg">
                          ✅ Плащането е потвърдено!
                        </h3>
                        <p className="text-gray-700">
                          Ресто: <span className="font-bold">{changeAmount}</span> лв.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Ако не сме намерили поръчка */}
                  {!faschingOrder && !showPaymentSuccess && (
                    <div className="space-y-4">
                      <div className="flex justify-center gap-4 mb-2">
                        <button
                          onClick={toggleFaschingScannerMode}
                          className={`btn ${isManualEntry ? 'btn-outline' : 'btn-primary'}`}
                        >
                          Сканирай QR
                        </button>
                        <button
                          onClick={toggleFaschingScannerMode}
                          className={`btn ${!isManualEntry ? 'btn-outline' : 'btn-primary'}`}
                        >
                          Въведи ръчно
                        </button>
                      </div>

                      {isManualEntry ? (
                        <div>
                          <label className="block mb-1 text-gray-700 font-medium">
                            Код за плащане (включително "F")
                          </label>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Напр. F123456"
                            value={paymentCode}
                            onChange={(e) => setPaymentCode(e.target.value)}
                          />
                          <button
                            onClick={handleCheckCode}
                            className="btn w-full bg-green-500 hover:bg-green-600 text-white font-semibold mt-3"
                          >
                            Провери кода
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isQrScannerOpen && (
                            <p className="text-center text-sm text-gray-500">
                              Камерата не е стартирана, натисни „Сканирай QR“
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {isQrScannerOpen && !isManualEntry && !faschingOrder && (
                    <div className="mt-4">
                      <QrScanner
                        onDecode={async (scannedCode) => await handleFaschingQrScan(scannedCode)}
                        onError={handleQrError}
                        constraints={{ facingMode: 'environment' }}
                      />
                      <button
                        onClick={() => setQrScannerOpen(false)}
                        className="btn mt-4 w-full"
                      >
                        Откажи сканиране
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Уверете се, че сте на <strong>HTTPS</strong> или <strong>localhost</strong>, 
                        и сте разрешили достъп до камерата.
                      </p>
                    </div>
                  )}

                  {faschingOrder && !faschingOrder.paid && !showPaymentSuccess && (
                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-100 p-3 rounded shadow">
                        <h3 className="text-lg font-semibold mb-1">
                          Поръчка #{faschingOrder.id} ({faschingOrder.paymentCode})
                        </h3>
                        <p className="text-sm text-gray-600">
                          <strong>Контакт:</strong> {faschingOrder.contactEmail}, {faschingOrder.contactPhone}
                          <br/>
                          <strong>Статус:</strong>{" "}
                          <span className="text-red-600 font-semibold">Неплатена</span>
                        </p>
                      </div>

                      <div className="bg-white border rounded p-3 shadow space-y-2">
                        <p className="font-semibold text-gray-800">
                          Брой Фашинг: {faschingCount} × 12 лв
                        </p>
                        <p className="font-semibold text-gray-800">
                          Брой Фашинг + Афтър: {faschingAfterCount} × 27 лв
                        </p>
                        <p className="font-bold text-lg text-gray-900 border-t pt-2 mt-2">
                          Общо дължимо: {totalDue} лв
                        </p>

                        <div className="mt-2">
                          <h4 className="font-semibold mb-1">Билети:</h4>
                          <ul className="list-disc list-inside text-gray-700">
                            {faschingTickets.map((ticket) => (
                              <li key={ticket.id} className="pl-1">
                                <span className="font-medium text-blue-800 mr-2">
                                  {formatTicketType(ticket.ticketType)}
                                </span>
                                - {ticket.guestFirstName} {ticket.guestLastName},
                                клас: {ticket.guestClassGroup}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-gray-700 font-medium">
                          Сума, която получихте (лв):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="input input-bordered w-full"
                          placeholder="Напр. 30"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                        />
                        <button
                          onClick={handleConfirmPayment}
                          className="btn w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                          disabled={isPaymentLoading}
                        >
                          {isPaymentLoading ? "Зареждане..." : "Потвърди плащането"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // ---------------------
                // Модал за НЕ-фашинг
                // ---------------------
                <NonFaschingModal
                  toggleModal={toggleModal}
                  eventId={eventId}
                  onCustomerAdded={onCustomerAdded}
                  paperTicketAccessToken={paperTicketAccessToken}
                  nineDigitCode={nineDigitCode}
                  setQrScannerOpen={setQrScannerOpen}
                  handleDeletePaperTicket={handleDeletePaperTicket}
                  errorMessage={errorMessage}
                  setPaperTicketAccessToken={setPaperTicketAccessToken}
                  userUuid={userUuid}
                  buttonLabel={buttonLabel}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR скенер за НЕ-фашинг */}
      {isQrScannerOpen && !isFasching && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <QrScanner
              onDecode={handleQrScan}
              onError={handleQrError}
              constraints={{ facingMode: 'environment' }}
            />
            <button onClick={() => setQrScannerOpen(false)} className="btn mt-4 w-full">
              Откажи сканиране
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Уверете се, че сте на <strong>HTTPS</strong> или <strong>localhost</strong>, 
              и сте разрешили достъп до камерата.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddCustomer;


/**
 * Оригиналната форма за НЕ-фашинг
 */
interface NonFaschingModalProps {
  toggleModal: () => void;
  eventId: string;
  onCustomerAdded: () => void;
  paperTicketAccessToken: string | null;
  nineDigitCode: string | null;
  setQrScannerOpen: (open: boolean) => void;
  handleDeletePaperTicket: () => void;
  errorMessage: string;
  setPaperTicketAccessToken: (token: string | null) => void;
  userUuid: string;
  buttonLabel?: string;
}

function NonFaschingModal({
  toggleModal,
  eventId,
  onCustomerAdded,
  paperTicketAccessToken,
  nineDigitCode,
  setQrScannerOpen,
  handleDeletePaperTicket,
  errorMessage,
  setPaperTicketAccessToken,
  userUuid,
  buttonLabel
}: NonFaschingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setFormError('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = {
      firstname: (form.elements.namedItem('name') as HTMLInputElement).value,
      lastname: (form.elements.namedItem('surname') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      guestsCount: (form.elements.namedItem('guests_count') as HTMLInputElement).value,
      eventUuid: eventId,
      paperTicketAccessToken: paperTicketAccessToken,
      sellerUuid: userUuid,
      reservation: (form.elements.namedItem('reservation') as HTMLInputElement).checked,
    };

    try {
      const isAuthenticated = await checkAuthenticated();
      if (!isAuthenticated) {
        setIsLoading(false);
        alert('Сесията ти е изтекла. Моля презареди страницата, за да влезеш в акаунта си отново.');
        router.refresh();
        return;
      }
      const response = await createManualTicket(formData);
      if (!response.success) {
        setFormError(response.message);
        setIsLoading(false);
        return;
      }
      setPaperTicketAccessToken(null);
      toggleModal();
      onCustomerAdded();
    } catch (error) {
      console.error('Failed to create manual ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <h2 className="text-xl mb-4 font-bold text-center text-gray-800">
        {buttonLabel || "Създай билет"}
      </h2>

      {formError && (
        <div className="text-red-500 mb-2 font-semibold">
          {formError}
        </div>
      )}
      {errorMessage && (
        <div className="text-red-500 mb-2 font-semibold">
          {errorMessage}
        </div>
      )}

      {paperTicketAccessToken ? (
        <div className='flex flex-row gap-2 mb-5 items-center'>
          <p className="font-semibold text-sm text-gray-700">
            Хартиен билет #<span className="text-blue-700">{nineDigitCode}</span>
          </p>
          <button onClick={handleDeletePaperTicket} className="btn btn-xs btn-error">
            Махни
          </button>
        </div>
      ) : (
        <button
          onClick={() => setQrScannerOpen(true)}
          className="btn btn-outline mb-4"
        >
          Добави хартиен билет
        </button>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className='block text-sm font-semibold text-gray-700 mb-1'>
              Име
            </label>
            <input
              id='name'
              type="text"
              placeholder="Име"
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="surname" className='block text-sm font-semibold text-gray-700 mb-1'>
              Фамилия
            </label>
            <input
              id='surname'
              type="text"
              placeholder="Фамилия"
              className="input input-bordered w-full"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className='block text-sm font-semibold text-gray-700 mb-1'>
            Имейл (на който ще се изпрати билетът)
          </label>
          <input
            id='email'
            type="email"
            placeholder="someone@example.com"
            className="input input-bordered w-full"
            required
          />
        </div>
        <input
          id='guests_count'
          type="hidden"
          defaultValue={1}
          min={1}
          required
        />
        <div className='flex items-center gap-2'>
          <input type="checkbox" id='reservation' value="reservation" className='checkbox checkbox-primary' />
          <label htmlFor="reservation" className='text-gray-700 text-sm cursor-pointer'>
            Резервация (не съм получил плащане)
          </label>
        </div>
        <button
          type="submit"
          className="btn btn-success w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Зареждане...' : (buttonLabel || 'Създай билет')}
        </button>
      </form>
    </div>
  );
}
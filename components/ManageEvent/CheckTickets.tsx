"use client";

import React, { useState, useCallback } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { checkAuthenticated } from '@/server/auth';

import {
  checkTicket,
  markAsEntered,
  markAsExited,
  paySepare,
} from '@/server/events/tickets/check';

const FASCHING_UUID = '956b2e2b-2a48-4f36-a6fa-50d25a2ab94d';

interface CheckTicketProps {
  eventId: string;
  /** Функция от родителя, която рефрешва списъка (на влезли/излезли) */
  onEnteredOrExited: () => void; 
}

export default function CheckTicket({ eventId, onEnteredOrExited }: CheckTicketProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [faschingMode, setFaschingMode] = useState<'fasching' | 'after'>('fasching');
  const [scanResult, setScanResult] = useState<any>(null);

  // За logic "изход"
  const [pendingExitTicketCode, setPendingExitTicketCode] = useState<string | null>(null);
  const [barcodeMessage, setBarcodeMessage] = useState('');
  const [barcodeColor, setBarcodeColor] = useState<'text-green-600' | 'text-yellow-600' | 'text-red-600' | ''>('');

  // --- Нови за сепаре (BARCODE) ---
  const [barcodeSepareData, setBarcodeSepareData] = useState<any>(null); // съхранява билетните данни
  const [showBarcodeSepareModal, setShowBarcodeSepareModal] = useState(false);
  const [barcodeSepareAmountPaid, setBarcodeSepareAmountPaid] = useState('');
  const [barcodeSepareError, setBarcodeSepareError] = useState('');
  const [barcodeSepareChange, setBarcodeSepareChange] = useState('');
  const [barcodeSepareLoading, setBarcodeSepareLoading] = useState(false);

  const isFasching = eventId === FASCHING_UUID;

  const openModal = async () => {
    const ok = await checkAuthenticated();
    if (!ok) {
      router.refresh();
      alert("Сесия изтекла. Моля презаредете.");
      return;
    }
    setIsOpen(true);
    resetStates();
  };

  const closeModal = () => {
    setIsOpen(false);
    resetStates();
  };

  const resetStates = () => {
    setBarcodeMode(false);
    setBarcodeValue('');
    setScanResult(null);
    setBarcodeMessage('');
    setBarcodeColor('');
    setFaschingMode('fasching');
    setPendingExitTicketCode(null);

    // Resets за pop-up сепаре (BARCODE)
    setBarcodeSepareData(null);
    setShowBarcodeSepareModal(false);
    setBarcodeSepareAmountPaid('');
    setBarcodeSepareError('');
    setBarcodeSepareChange('');
    setBarcodeSepareLoading(false);
  };

  // ------------------ QR режим ------------------
  const handleDecode = async (data: string) => {
    if (!data) return;
    try {
      const resp = await checkTicket({
        qrData: data,
        eventUuid: eventId,
        mode: isFasching ? faschingMode : undefined,
      });
      setScanResult(resp);
    } catch (err) {
      console.error("QR decode error:", err);
      setScanResult({ success: false });
    }
  };

  // ------------------ BARCODE режим ------------------
  const handleBarcodeSubmit = useCallback(async () => {
    if (!barcodeValue) return;

    // Ако имаме "pendingExitTicketCode": потребител вече е влязъл => проверяваме дали сега искаме да го изкараме
    if (pendingExitTicketCode) {
      if (barcodeValue === pendingExitTicketCode) {
        await doExit(barcodeValue);
        setBarcodeColor('text-green-600');
        setBarcodeMessage('Отбелязан като излязъл!');
        setPendingExitTicketCode(null);
        setBarcodeValue('');
        onEnteredOrExited();
        return;
      } else {
        setPendingExitTicketCode(null);
      }
    }

    // Иначе: checkTicket
    try {
      const resp = await checkTicket({
        qrData: barcodeValue,
        eventUuid: eventId,
        mode: isFasching ? faschingMode : undefined,
      });

      if (!resp.success) {
        setBarcodeColor('text-red-600');
        setBarcodeMessage('Билетът не е валиден за този режим.');
      } else {
        if (isFasching) {
          // ---------------- FASCHING ЛОГИКА ----------------
          const r = resp.response;
          const currentlyEntered =
            faschingMode === 'fasching'
              ? r.entered_fasching
              : r.entered_after;

          if (!currentlyEntered) {
            // Проверяваме дали е AFTER + fasching-after + owesForSepare
            if (faschingMode === 'after' && r.ticketType === 'fasching-after') {
              // Ако дължи сепаре => Показваме модал, без да маркираме entered
              const owes = parseFloat(r.owesForSepare || "0");
              const alreadyPaid = !!r.separeSellerId;
              if (owes > 0 && !alreadyPaid) {
                // Показваме модал
                setBarcodeSepareData(r);
                setShowBarcodeSepareModal(true);
                // Нулираме input полето
                setBarcodeSepareAmountPaid('');
                setBarcodeSepareError('');
                setBarcodeSepareChange('');
                setBarcodeSepareLoading(false);

                // Feedback
                setBarcodeColor('text-yellow-600');
                setBarcodeMessage(
                  `Билетът дължи ${owes} лв. за сепаре. Моля въведете платената сума.`
                );
              } else {
                // Няма дълг => директно markAsEntered
                await markAsEntered({
                  ticketToken: r.requestedToken,
                  eventUuid: eventId,
                  mode: 'after'
                });
                setBarcodeColor('text-green-600');
                setBarcodeMessage(`Влязъл (after): ${r.guestFirstName} ${r.guestLastName}`);
                onEnteredOrExited();
              }
            } else {
              // Ако сме в fasching-mode (или билетът е само 'fasching'), директно markAsEntered
              await markAsEntered({
                ticketToken: r.requestedToken,
                eventUuid: eventId,
                mode: faschingMode
              });
              setBarcodeColor('text-green-600');
              setBarcodeMessage(`Влязъл: ${r.guestFirstName} ${r.guestLastName} (${r.guestEmail})`);
              onEnteredOrExited();
            }
          } else {
            // Ако вече е влязъл, при повторно сканиране отбелязваме излизане
            setPendingExitTicketCode(r.requestedToken);
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(
              `Потребителят ${r.guestFirstName} ${r.guestLastName} вече е влязъл. 
               Сканирай още веднъж, за да го отбележиш като излязъл.`
            );
          }
        } else {
          // ---------------- СТАНДАРТНО СЪБИТИЕ ----------------
          const c = resp.response;
          if (!c.isEntered) {
            await markAsEntered({
              ticketToken: c.requestedToken,
              eventUuid: eventId,
            });
            setBarcodeColor('text-green-600');
            setBarcodeMessage(`Влязъл: ${c.firstName} ${c.lastName} (${c.email})`);
            onEnteredOrExited();
          } else {
            // Вече е влязъл => exit
            setPendingExitTicketCode(c.requestedToken);
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(
              `Потребителят ${c.firstName} ${c.lastName} вече е влязъл. 
               Сканирай още веднъж, за да го отбележиш като излязъл.`
            );
          }
        }
      }
    } catch (error) {
      console.error('Barcode error:', error);
      setBarcodeColor('text-red-600');
      setBarcodeMessage('Възникна грешка!');
    }
    setBarcodeValue('');
  }, [
    barcodeValue,
    isFasching,
    faschingMode,
    eventId,
    pendingExitTicketCode,
    onEnteredOrExited
  ]);

  // При Exit
  const doExit = async (token: string) => {
    await markAsExited({
      ticketToken: token,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    // Може да се направи onEnteredOrExited() тук, 
    // но вече го извикахме горе в handleBarcodeSubmit
  };

  // ------------------ BARCODE Separe Payment ------------------
  const handlePaySepareBarcode = async () => {
    try {
      setBarcodeSepareError('');
      setBarcodeSepareChange('');
      setBarcodeSepareLoading(true);

      if (!barcodeSepareData) {
        setBarcodeSepareError("Липсват данни за билета!");
        setBarcodeSepareLoading(false);
        return;
      }

      const amt = parseFloat(barcodeSepareAmountPaid);
      if (isNaN(amt) || amt <= 0) {
        setBarcodeSepareError("Моля въведете валидна сума!");
        setBarcodeSepareLoading(false);
        return;
      }

      const resp = await paySepare({
        ticketToken: barcodeSepareData.requestedToken,
        eventUuid: eventId,
        amountPaid: amt,
      });
      if (!resp.success) {
        setBarcodeSepareError(resp.message || "Грешка при плащане на сепаре.");
      } else {
        // Ако има ресто
        if (resp.change && resp.change > 0) {
          setBarcodeSepareChange(`Ресто: ${resp.change.toFixed(2)} лв.`);
        }
        // Когато е успешно, paySepare автоматично е маркирал entered_after = true
        onEnteredOrExited();
        // Затваряме модала след 1.5 сек
        setTimeout(() => {
          setShowBarcodeSepareModal(false);
          // За UI - зелено съобщение
          setBarcodeColor('text-green-600');
          setBarcodeMessage('Успешно платено за сепаре + влязъл.');
          setBarcodeSepareData(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setBarcodeSepareError("Грешка при плащане на сепаре.");
    }
    setBarcodeSepareLoading(false);
  };

  return (
    <>
      <button onClick={openModal} className="btn bg-blue-600 text-white px-4 py-2 rounded">
        Проверка на билети
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-4 rounded max-w-lg w-full relative">
            <h2 className="text-xl font-bold mb-4">Проверка на билети</h2>

            {isFasching && (
              <div className="mb-2">
                <label className="font-semibold mr-2">Режим:</label>
                <select
                  value={faschingMode}
                  onChange={(e) => setFaschingMode(e.target.value as 'fasching' | 'after')}
                  className="border rounded px-2 py-1"
                >
                  <option value="fasching">Fasching</option>
                  <option value="after">After Party</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <button
                className={`px-3 py-1 rounded border ${!barcodeMode ? 'bg-blue-500 text-white' : ''}`}
                onClick={() => {
                  setBarcodeMode(false);
                  setScanResult(null);
                  setBarcodeMessage('');
                  setBarcodeColor('');
                  setPendingExitTicketCode(null);
                }}
              >
                QR
              </button>
              <button
                className={`px-3 py-1 rounded border ${barcodeMode ? 'bg-blue-500 text-white' : ''}`}
                onClick={() => {
                  setBarcodeMode(true);
                  setScanResult(null);
                  setBarcodeMessage('');
                  setBarcodeColor('');
                  setPendingExitTicketCode(null);
                }}
              >
                Barcode
              </button>
            </div>

            {/* BARCODE MODE */}
            {barcodeMode && (
              <div>
                <input
                  type="text"
                  placeholder="Сканирай баркод..."
                  className="border p-2 w-full"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeSubmit();
                    }
                  }}
                />
                {barcodeMessage && (
                  <p className={`mt-2 font-semibold ${barcodeColor}`}>
                    {barcodeMessage}
                  </p>
                )}
              </div>
            )}

            {/* QR MODE */}
            {!barcodeMode && (
              <>
                {!scanResult && (
                  <QrScanner
                    onDecode={handleDecode}
                    onError={(err) => console.error(err)}
                    containerStyle={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}
                    videoStyle={{ width: '100%' }}
                  />
                )}
                {scanResult && (
                  <QRResult
                    scanResult={scanResult}
                    eventId={eventId}
                    faschingMode={faschingMode}
                    onClose={() => setScanResult(null)}
                    onEnteredOrExited={onEnteredOrExited}
                  />
                )}
              </>
            )}

            {/* Modал за сепаре при BARCODE */}
            {showBarcodeSepareModal && (
              <div className="mt-4 border p-2 bg-red-50">
                <p className="font-semibold text-red-600">
                  Дължима сума за сепаре: {barcodeSepareData?.owesForSepare} лв.
                </p>
                <p>Въведи получената сума:</p>
                <input
                  type="number"
                  step="0.01"
                  className="border px-2 py-1 mt-1"
                  value={barcodeSepareAmountPaid}
                  onChange={(e) => setBarcodeSepareAmountPaid(e.target.value)}
                />
                <button
                  onClick={handlePaySepareBarcode}
                  disabled={barcodeSepareLoading}
                  className="ml-2 bg-blue-600 text-white px-3 py-1 rounded"
                >
                  {barcodeSepareLoading ? "..." : "Плати"}
                </button>

                {barcodeSepareError && (
                  <p className="text-red-600 mt-1">{barcodeSepareError}</p>
                )}
                {barcodeSepareChange && (
                  <p className="text-blue-600 font-semibold mt-1">
                    {barcodeSepareChange}
                  </p>
                )}
                <button
                  onClick={() => {
                    setShowBarcodeSepareModal(false);
                    setBarcodeSepareData(null);
                  }}
                  className="block mt-2 text-sm underline text-gray-600"
                >
                  Затвори
                </button>
              </div>
            )}

            {/* Бутон "Close" ако не сме в състояние на показване на QRResult */}
            {!scanResult && (
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Компонент за резултата при QR сканиране.
 */
function QRResult({ scanResult, eventId, faschingMode, onClose, onEnteredOrExited }: any) {
  if (!scanResult.success) {
    return (
      <div className="mt-4 text-center">
        <p className="text-red-600 font-bold">Билетът не е валиден</p>
        <button
          onClick={() => onClose()}
          className="btn bg-red-500 text-white mt-2 px-4 py-2 rounded"
        >
          Сканирай друг
        </button>
      </div>
    );
  }

  const data = scanResult.response;
  const isFasching = (eventId === FASCHING_UUID);

  let currentlyIn = false;
  if (isFasching) {
    currentlyIn =
      faschingMode === 'fasching'
        ? data.entered_fasching
        : data.entered_after;
  } else {
    currentlyIn = data.isEntered;
  }

  return (
    <div className="mt-4 text-center">
      {currentlyIn ? (
        <div className="text-yellow-600 font-semibold">
          Потребителят вече е влязъл
        </div>
      ) : (
        <div className="text-green-600 font-semibold">
          Билетът е валиден и потребителят не е влязъл
        </div>
      )}

      <div className="text-left mt-4 p-2 border rounded bg-gray-50">
        {isFasching ? (
          <>
            <p><strong>Име:</strong> {data.guestFirstName} {data.guestLastName}</p>
            <p><strong>Email:</strong> {data.guestEmail}</p>
            <p><strong>Тип билет:</strong> {data.ticketType}</p>
          </>
        ) : (
          <>
            <p><strong>Име:</strong> {data.firstName} {data.lastName}</p>
            <p><strong>Email:</strong> {data.email}</p>
            <p><strong>Гости:</strong> {data.guestCount}</p>
            {data.nineDigitCode && (
              <p className="bg-orange-500 text-white inline-block px-2 py-1 rounded mt-2">
                Хартиен билет #{data.nineDigitCode}
              </p>
            )}
          </>
        )}
      </div>

      {/* Ако е Fasching AFTER + "fasching-after", проверка за сепаре */}
      {isFasching && faschingMode === 'after' && data.ticketType === 'fasching-after' ? (
        <SeparePaymentUI
          data={data}
          eventId={eventId}
          onClose={onClose}
          onEnteredOrExited={onEnteredOrExited}
        />
      ) : (
        <EnterExitButtons
          isFasching={isFasching}
          faschingMode={faschingMode}
          data={data}
          currentlyIn={currentlyIn}
          eventId={eventId}
          onClose={onClose}
          onEnteredOrExited={onEnteredOrExited}
        />
      )}
    </div>
  );
}

/**
 * Показваме бутони "Влез / Излез", ако няма дълг за сепаре.
 */
function EnterExitButtons({
  isFasching,
  faschingMode,
  data,
  currentlyIn,
  eventId,
  onClose,
  onEnteredOrExited
}: any) {
  const handleEnter = async () => {
    await markAsEntered({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onEnteredOrExited();
    onClose();
  };

  const handleExit = async () => {
    await markAsExited({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onEnteredOrExited();
    onClose();
  };

  return (
    <div className="flex gap-2 mt-4 justify-center">
      {currentlyIn ? (
        <button
          onClick={handleExit}
          className="px-4 py-2 rounded bg-yellow-500 text-white"
        >
          Отбележи като излязъл
        </button>
      ) : (
        <button
          onClick={handleEnter}
          className="px-4 py-2 rounded bg-green-600 text-white"
        >
          Отбележи като влязъл
        </button>
      )}
      <button onClick={() => onClose()} className="px-4 py-2 rounded bg-gray-200">
        Сканирай друг
      </button>
    </div>
  );
}

/**
 * UI за плащане на сепаре (ако owesForSepare > 0) при QR Mode (за Fasching AFTER).
 */
function SeparePaymentUI({
  data,
  eventId,
  onClose,
  onEnteredOrExited,
}: any) {
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [payError, setPayError] = useState("");
  const [changeMsg, setChangeMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const owes = parseFloat(data.owesForSepare || "0");
  const alreadyPaid = data.separeSellerId ? true : false;
  const needsSeparePayment = owes > 0 && !alreadyPaid;

  const handlePay = async () => {
    setPayError("");
    setChangeMsg("");
    setLoading(true);
    try {
      const val = parseFloat(amountPaid);
      if (isNaN(val) || val <= 0) {
        setPayError("Моля въведете валидна сума!");
        setLoading(false);
        return;
      }

      const resp = await paySepare({
        ticketToken: data.requestedToken,
        eventUuid: eventId,
        amountPaid: val,
      });
      if (!resp.success) {
        setPayError(resp.message || "Грешка при плащане за сепаре.");
      } else {
        if (resp.change && resp.change > 0) {
          setChangeMsg(`Ресто: ${resp.change.toFixed(2)} лв.`);
        }
        onEnteredOrExited();
        // Затваряме след малка пауза
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setPayError("Грешка при плащане.");
    }
    setLoading(false);
  };

  // Ако няма нужда от плащане, показваме стандартни бутони
  if (!needsSeparePayment) {
    return (
      <EnterExitButtons
        isFasching={true}
        faschingMode="after"
        data={data}
        currentlyIn={data.entered_after}
        eventId={eventId}
        onClose={onClose}
        onEnteredOrExited={onEnteredOrExited}
      />
    );
  }

  // Иначе показваме форма
  return (
    <div className="mt-4 p-2 border rounded bg-red-50 text-center">
      <p className="font-semibold text-red-600">
        Този билет дължи за сепаре: {owes.toFixed(2)} лв.
      </p>

      {!showPayment ? (
        <button
          onClick={() => setShowPayment(true)}
          className="bg-green-600 text-white px-4 py-2 mt-2 rounded"
        >
          Плати сега
        </button>
      ) : (
        <div className="mt-2">
          <p>Въведи получената сума:</p>
          <input
            type="number"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="border px-2 py-1 mt-1"
          />
          <button
            onClick={handlePay}
            disabled={loading}
            className="ml-2 bg-blue-600 text-white px-3 py-1 rounded"
          >
            {loading ? "..." : "Потвърди плащането"}
          </button>

          {payError && <p className="text-red-600 mt-1">{payError}</p>}
          {changeMsg && (
            <p className="text-blue-600 mt-1 font-semibold">{changeMsg}</p>
          )}
        </div>
      )}

      <button
        onClick={() => onClose()}
        className="mt-2 underline text-sm text-gray-600"
      >
        Затвори
      </button>
    </div>
  );
}

"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { checkAuthenticated } from '@/server/auth';

// Сървърни методи:
import {
  checkTicket,
  markAsEntered,
  markAsExited,
} from '@/server/events/tickets/check';

const FASCHING_UUID = '956b2e2b-2a48-4f36-a6fa-50d25a2ab94d';

export default function CheckTicket({ eventId }) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  // "barcodeMode" vs "QR"
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  // Фашинг => избор fasching/after
  const [faschingMode, setFaschingMode] = useState<'fasching' | 'after'>('fasching');

  // Резултат от checkTicket
  const [scanResult, setScanResult] = useState<any>(null);

  // Съобщения за баркод статуса
  const [barcodeMessage, setBarcodeMessage] = useState('');
  const [barcodeColor, setBarcodeColor] = useState<'text-green-600' | 'text-yellow-600' | 'text-red-600' | ''>('');

  // При потвърждение на излизане (баркод)
  const [pendingExit, setPendingExit] = useState<any>(null); // пазим user данните, които чакат потвърждение

  const isFasching = (eventId === FASCHING_UUID);

  // Отваряне на модала
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

  // Нулиране на локалното състояние
  const resetStates = () => {
    setBarcodeMode(false);
    setBarcodeValue('');
    setScanResult(null);
    setBarcodeMessage('');
    setBarcodeColor('');
    setFaschingMode('fasching');
    setPendingExit(null);
  };

  // При QR decode
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

  // При баркод submit
  const handleBarcodeSubmit = useCallback(async () => {
    if (!barcodeValue) return;

    // Ако имаме "pendingExit", проверяваме дали user натиска Enter, за да потвърди излизане
    if (pendingExit?.success) {
      // Потвърди излизане
      await doExit(pendingExit.response.requestedToken);
      // Ресет
      setPendingExit(null);
      setBarcodeValue('');
      return;
    }

    // Иначе -> checkTicket
    try {
      const resp = await checkTicket({
        qrData: barcodeValue,
        eventUuid: eventId,
        mode: isFasching ? faschingMode : undefined,
      });

      if (!resp.success) {
        // Невалиден
        setBarcodeColor('text-red-600');
        setBarcodeMessage('Билетът не е валиден за този режим.');
      } else {
        // Валиден
        if (isFasching) {
          // Проверяваме entered_fasching/entered_after
          const r = resp.response;
          const currentlyEntered = (faschingMode === 'fasching')
            ? r.entered_fasching
            : r.entered_after;
          
          if (!currentlyEntered) {
            // Автоматично "влиза"
            await markAsEntered({
              ticketToken: r.requestedToken,
              eventUuid: eventId,
              mode: faschingMode
            });
            setBarcodeColor('text-green-600');
            setBarcodeMessage(`Влязъл: ${r.guestFirstName} ${r.guestLastName} (${r.guestEmail})`);
          } else {
            // Изискваме потвърждение
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(`Потребителят ${r.guestFirstName} ${r.guestLastName} вече е влязъл. Сканирай билета му отново, за да го отбележиш като излязъл.`);
            setPendingExit(resp); // Запомняме данните и чакаме второ Enter
          }
        } else {
          // Стандартно
          const c = resp.response;
          if (!c.isEntered) {
            // Автоматично влиза
            await markAsEntered({
              ticketToken: c.requestedToken,
              eventUuid: eventId,
            });
            setBarcodeColor('text-green-600');
            setBarcodeMessage(`Влязъл: ${c.firstName} ${c.lastName} (${c.email})`);
          } else {
            // Изискваме потвърждение
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(`Потребителят ${c.firstName} ${c.lastName} вече е влязъл. Натисни Enter отново, за да го отбележиш като излязъл.`);
            setPendingExit(resp);
          }
        }
      }
    } catch (error) {
      console.error("Barcode error:", error);
      setBarcodeColor('text-red-600');
      setBarcodeMessage('Възникна грешка!');
    }
    setBarcodeValue('');
  }, [barcodeValue, isFasching, faschingMode, eventId, pendingExit]);

  // Ф-я за излизане (при баркод confirm)
  const doExit = async (token: string) => {
    await markAsExited({
      ticketToken: token,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    setBarcodeColor('text-green-600');
    setBarcodeMessage('Отбелязан като излязъл!');
  };

  // UI
  return (
    <>
      <button onClick={openModal} className="btn bg-blue-600 text-white px-4 py-2 rounded">
        Проверка на билети
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-4 rounded max-w-lg w-full relative">
            <h2 className="text-xl font-bold mb-4">Проверка на билети</h2>

            {/* Фашинг -> select fasching/after */}
            {isFasching && (
              <div className="mb-2">
                <label className="font-semibold mr-2">Режим:</label>
                <select
                  value={faschingMode}
                  onChange={(e) => setFaschingMode(e.target.value as 'fasching' | 'after')}
                  className="border rounded px-2 py-1"
                >
                  <option value="fasching">Fasching (основно събитие)</option>
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
                  setPendingExit(null);
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
                  setPendingExit(null);
                }}
              >
                Barcode
              </button>
            </div>

            {/* BARCODE MODE */}
            {barcodeMode ? (
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
                  <p className={`mt-2 font-semibold ${barcodeColor}`}>{barcodeMessage}</p>
                )}
              </div>
            ) : (
              // QR MODE
              <div>
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
                    onClose={() => setScanResult(null)} // "Сканирай друг"
                  />
                )}
              </div>
            )}

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
 * Показваме детайли, ако QR е валиден. Операторът може да натисне "влез" или "излез".
 * При фашинг -> гледаме entered_fasching / entered_after
 */
function QRResult({ scanResult, eventId, faschingMode, onClose }: any) {
  if (!scanResult.success) {
    return (
      <div className="mt-4 text-center">
        <p className="text-red-600 font-bold">Билетът не е валиден</p>
        <button onClick={() => onClose()} className="btn bg-red-500 text-white mt-2 px-4 py-2 rounded">
          Сканирай друг
        </button>
      </div>
    );
  }

  const data = scanResult.response;
  const isFasching = (eventId === FASCHING_UUID);

  // Проверяваме дали е влязъл
  let currentlyIn = false;
  if (isFasching) {
    // mode => fasching/after
    if (faschingMode === 'fasching') {
      currentlyIn = data.entered_fasching;
    } else {
      currentlyIn = data.entered_after;
    }
  } else {
    // стандартен
    currentlyIn = data.isEntered;
  }

  // Можем да показваме повече инфо
  const userInfo = (
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
          <p><strong>Създаден:</strong> {data.createdAt}</p>
          {data.nineDigitCode && (
            <p className="bg-orange-500 text-white inline-block px-2 py-1 rounded mt-2">
              Хартиен билет #{data.nineDigitCode}
            </p>
          )}
        </>
      )}
    </div>
  );

  const handleEnter = async () => {
    await markAsEntered({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onClose(); // изчистваме, за да може да сканираме друг
  };

  const handleExit = async () => {
    await markAsExited({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onClose();
  };

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

      {userInfo}

      <div className="flex gap-2 mt-4 justify-center">
        {currentlyIn ? (
          <button onClick={handleExit} className="px-4 py-2 rounded bg-yellow-500 text-white">
            Отбележи като излязъл
          </button>
        ) : (
          <button onClick={handleEnter} className="px-4 py-2 rounded bg-green-600 text-white">
            Отбележи като влязъл
          </button>
        )}
        <button onClick={() => onClose()} className="px-4 py-2 rounded bg-gray-200">
          Сканирай друг
        </button>
      </div>
    </div>
  );
}

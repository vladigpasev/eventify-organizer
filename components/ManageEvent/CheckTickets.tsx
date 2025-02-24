"use client";

import React, { useState, useCallback } from 'react';
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

  // Показване на QR vs Barcode
  const [barcodeMode, setBarcodeMode] = useState(false);

  // За въвеждане на баркод
  const [barcodeValue, setBarcodeValue] = useState('');

  // Фашинг => избор fasching/after
  const [faschingMode, setFaschingMode] = useState<'fasching' | 'after'>('fasching');

  // Резултат от checkTicket (за да се покаже в QR режим)
  const [scanResult, setScanResult] = useState<any>(null);

  // За баркод: ако потребителят вече е влязъл, пазим кода му тук (чака второ сканиране за излизане).
  const [pendingExitTicketCode, setPendingExitTicketCode] = useState<string | null>(null);

  // Съобщения при баркод
  const [barcodeMessage, setBarcodeMessage] = useState('');
  const [barcodeColor, setBarcodeColor] = useState<'text-green-600' | 'text-yellow-600' | 'text-red-600' | ''>('');

  const isFasching = eventId === FASCHING_UUID;

  // ----------------------- Модал контрол ----------------------------
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
  };

  // ----------------------- QR ЛОГИКА (НЕ ПРОМЕНЯМЕ) ----------------------------
  // Тук си ползваме бутоните "Отбележи като влязъл/излязъл" отдолу
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

  // ----------------------- БАРКОД ЛОГИКА ----------------------------
  const handleBarcodeSubmit = useCallback(async () => {
    if (!barcodeValue) return;

    // 1) Проверка дали имаме "pending exit" код
    if (pendingExitTicketCode) {
      // a) Ако сканираният код съвпада => маркираме като излязъл
      if (barcodeValue === pendingExitTicketCode) {
        await doExit(barcodeValue);
        setBarcodeColor('text-green-600');
        setBarcodeMessage('Отбелязан като излязъл!');
        setPendingExitTicketCode(null);
        setBarcodeValue('');
        return;
      } else {
        // b) Ако е друг код => забравяме чакащия код и продължаваме с новия код
        setPendingExitTicketCode(null);
      }
    }

    // 2) "Нормална" проверка на баркода (ако не е влязъл => влиза, ако е влязъл => чака повторно)
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
        // Валиден
        if (isFasching) {
          // Фашинг логика
          const r = resp.response;
          const currentlyEntered =
            faschingMode === 'fasching'
              ? r.entered_fasching
              : r.entered_after;

          if (!currentlyEntered) {
            // Ако не е влязъл => маркираме като влязъл
            await markAsEntered({
              ticketToken: r.requestedToken,
              eventUuid: eventId,
              mode: faschingMode
            });
            setBarcodeColor('text-green-600');
            setBarcodeMessage(`Влязъл: ${r.guestFirstName} ${r.guestLastName} (${r.guestEmail})`);
          } else {
            // Ако е влязъл => очакваме второ сканиране, за да го отбележим излязъл
            setPendingExitTicketCode(r.requestedToken);
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(
              `Потребителят ${r.guestFirstName} ${r.guestLastName} вече е влязъл. 
              Сканирай същия баркод отново, за да го отбележиш като излязъл.`
            );
          }
        } else {
          // Стандартно събитие
          const c = resp.response;
          if (!c.isEntered) {
            // Не е влязъл
            await markAsEntered({
              ticketToken: c.requestedToken,
              eventUuid: eventId,
            });
            setBarcodeColor('text-green-600');
            setBarcodeMessage(`Влязъл: ${c.firstName} ${c.lastName} (${c.email})`);
          } else {
            // Вече е влязъл => изискваме второ сканиране
            setPendingExitTicketCode(c.requestedToken);
            setBarcodeColor('text-yellow-600');
            setBarcodeMessage(
              `Потребителят ${c.firstName} ${c.lastName} вече е влязъл. 
              Сканирай същия баркод отново, за да го отбележиш като излязъл.`
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
  }, [barcodeValue, isFasching, faschingMode, eventId, pendingExitTicketCode]);

  // Помощна ф-я за излизане
  const doExit = async (token: string) => {
    await markAsExited({
      ticketToken: token,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
  };

  // ----------------------- JSX ----------------------------
  return (
    <>
      <button onClick={openModal} className="btn bg-blue-600 text-white px-4 py-2 rounded">
        Проверка на билети
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-4 rounded max-w-lg w-full relative">
            <h2 className="text-xl font-bold mb-4">Проверка на билети</h2>

            {/* Ако е Fasching -> показваме селект за fasching/after */}
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

            {/* Бутони за превключване между QR и Баркод */}
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
                  <p className={`mt-2 font-semibold ${barcodeColor}`}>
                    {barcodeMessage}
                  </p>
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
                    onClose={() => setScanResult(null)}
                  />
                )}
              </div>
            )}

            {/* Бутон "Затвори" */}
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

// Оригиналният компонент за QR резултата (с бутоните "Влез" / "Излез"):
function QRResult({ scanResult, eventId, faschingMode, onClose }: any) {
  const FASCHING_UUID = '956b2e2b-2a48-4f36-a6fa-50d25a2ab94d';
  const isFasching = eventId === FASCHING_UUID;

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
  // Проверяваме дали е "влязъл"
  let currentlyIn = false;
  if (isFasching) {
    // ако е Fasching => гледаме entered_fasching / entered_after
    currentlyIn =
      faschingMode === 'fasching'
        ? data.entered_fasching
        : data.entered_after;
  } else {
    // Стандартно
    currentlyIn = data.isEntered;
  }

  const handleEnter = async () => {
    await markAsEntered({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onClose(); 
  };

  const handleExit = async () => {
    await markAsExited({
      ticketToken: data.requestedToken,
      eventUuid: eventId,
      mode: isFasching ? faschingMode : undefined
    });
    onClose();
  };

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
          {data.nineDigitCode && (
            <p className="bg-orange-500 text-white inline-block px-2 py-1 rounded mt-2">
              Хартиен билет #{data.nineDigitCode}
            </p>
          )}
        </>
      )}
    </div>
  );

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
        <button
          onClick={() => onClose()}
          className="px-4 py-2 rounded bg-gray-200"
        >
          Сканирай друг
        </button>
      </div>
    </div>
  );
}

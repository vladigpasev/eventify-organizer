//Copyright (C) 2024  Vladimir Pasev
"use client"

import React, { useState, useEffect } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { checkTicket, markAsEntered, markAsExited } from '@/server/events/tickets/check';
import { checkAuthenticated } from '@/server/auth';
import { useRouter } from 'next/navigation';

//@ts-ignore
function CheckTicket({ eventId, onEnteredOrExited }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const router = useRouter();
  const toggleModal = async () => {
    const isAuthenticated = await checkAuthenticated(); // Check if the user is authenticated
    if (isAuthenticated) {
      setModalOpen(!isModalOpen); // If authenticated, toggle the modal
    } else {
      router.refresh(); // If not authenticated, reload the page
      alert('Сесията ви е изтекла. Моля, опреснете страницата, за да влезете отново.')
    }
  };

  return (
    <div>
      <button onClick={toggleModal} className='btn'><svg width={34} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M5.75 13.75v4.5h4.5v-4.5h-4.5Z"></path><path fill="currentColor" d="M17 17h2v2h-2Z"></path><path fill="currentColor" d="M13 13h2v2h-2Z"></path><path fill="currentColor" d="M15 15h2v2h-2Z"></path><path fill="currentColor" d="M13 17h2v2h-2Z"></path><path fill="none" stroke="currentColor" stroke-width="1.5" d="M18.25 5.75v4.5h-4.5v-4.5h4.5Z"></path><path fill="none" stroke="currentColor" stroke-width="1.5" d="M5.75 5.75v4.5h4.5v-4.5h-4.5Z"></path></svg>Проверка на билети </button>

      {isModalOpen && (
        <Modal
          toggleModal={toggleModal}
          eventId={eventId}
          scanResult={scanResult}
          setScanResult={setScanResult}
          ticketTokenProp={null}
          onEnteredOrExited={onEnteredOrExited}
        />
      )}
    </div>
  );
}

//@ts-ignore
export function Modal({ toggleModal, eventId, scanResult, setScanResult, ticketTokenProp, onEnteredOrExited }) {
  const [ticketToken, setTicketToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  //@ts-ignore
  const handleDecode = async (result) => {
    if (result) {
      try {
        const response = await checkTicket({ qrData: result, eventUuid: eventId });
        setTicketToken(result);
        setScanResult(response); // Display the result
      } catch (error) {
        console.error('Error processing QR code:', error);
      }
    }
  };
  //@ts-ignore
  const handleError = (error) => {
    console.error('Error during QR Code scan:', error);
  };

  const handleMarkAsEntered = async () => {
    const data = {
      ticketToken: ticketToken,
      eventUuid: eventId
    };

    try {
      await markAsEntered(data);
      setScanResult(null);
      onEnteredOrExited();
    } catch (error) {
      console.error('Error marking ticket as entered:', error);
    }

  };

  useEffect(() => {
    const checkTicketWithToken = async () => {
      if (ticketTokenProp) {
        try {
          const response = await checkTicket({ qrData: ticketTokenProp, eventUuid: eventId });
          setTicketToken(ticketTokenProp);
          setScanResult(response); // Display the result
        } catch (error) {
          console.error('Error processing ticket token:', error);
        }
      }
      setIsLoading(false); // Set loading to false after processing
    };

    checkTicketWithToken();
  }, [ticketTokenProp, eventId, setScanResult]);

  const ResultScreen = () => {
    if (scanResult?.success) {
      const { response: currentCustomer } = scanResult;

      const handleExit = async () => {
        const data = {
          ticketToken: ticketToken,
          eventUuid: eventId
        };

        try {
          await markAsExited(data);
          setScanResult(null);
          onEnteredOrExited();
        } catch (error) {
          console.error('Error marking ticket as exited:', error);
        }
      };
      return (
        <div className="text-center p-4">
          {currentCustomer.isEntered ? (
            <div>
              <div className="text-yellow-500">
                <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                <p className="text-xl font-bold">Потребителят е вече в събитието</p>
              </div>
              <UserInfo currentCustomer={currentCustomer} />
              <div className='flex'>
                <button onClick={handleExit} className="btn bg-yellow-500 text-white mt-4 w-full">
                  Отбележи като напуснал
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-green-500">
                <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <p className="text-xl font-bold">Билетът е валиден</p>
              </div>
              <UserInfo currentCustomer={currentCustomer} />
              <div className='flex'>
                <button onClick={handleMarkAsEntered} className="btn bg-green-500 text-white mt-4 w-full">
                  Отбележи като влязъл
                </button>
              </div>
            </div>
          )}
          <div className='flex flex-col justify-center gap-5'>
            <button onClick={() => { setScanResult(null); }} className="btn btn-secondary mt-4">
              Сканирай друг
            </button>
            <button onClick={() => { setScanResult(null); toggleModal(); }} className="link mt-4">
              Затвори
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center p-4">
          <div className="text-red-500">
            <svg className="mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={50} height={50}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            <p className="text-xl font-bold">Билетът не е валиден</p>
          </div>
          <div className='flex flex-col justify-center gap-5'>
            <button onClick={() => { setScanResult(null) }} className="btn bg-red-500 text-white mt-4">
              Сканирай друг
            </button>
            <button onClick={() => { setScanResult(null); toggleModal(); }} className="link mt-4">
              Затвори
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4 z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        {isLoading ? (
          <div>Зареждане...</div> // Show loading indicator
        ) : !scanResult ? (
          <>
            <QrScanner
              onDecode={handleDecode}
              onError={handleError}
            />
            <button onClick={toggleModal} className="btn mt-4">Откажи сканиране</button>
          </>
        ) : <ResultScreen />}
      </div>
    </div>
  );
}

//@ts-ignore 
const UserInfo = ({ currentCustomer }) => (
  <div className="mt-4 text-left">
    <p><strong>Име:</strong> {currentCustomer.firstName} {currentCustomer.lastName}</p>
    <p><strong>Имейл:</strong> {currentCustomer.email}</p>
    <p><strong>Брой гости:</strong> {currentCustomer.guestCount}</p>
    <p><strong>Име на продавач:</strong> {currentCustomer.sellerName} ({currentCustomer.sellerEmail})</p>
    <p><strong>Създаден на:</strong> {currentCustomer.createdAt}</p>
    {currentCustomer.nineDigitCode && (
      <p className="bg-orange-500 text-white p-2 rounded-md mt-2">Хартиен билет<strong> #{currentCustomer.nineDigitCode}</strong></p>
    )}
  </div>
);



export default CheckTicket;
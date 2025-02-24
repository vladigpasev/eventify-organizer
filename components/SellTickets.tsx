"use client";
import React, { useState, useEffect } from 'react';
import { addSeller, getSellers } from '@/server/sellers/actions';

function SellTickets({ eventUuid, isSeller }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sellers, setSellers] = useState([]);

  // Определяме дали е Fasching
  const isFasching = (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const response = await getSellers({ eventUuid });
        if (response.success) {
          //@ts-ignore
          setSellers(response.sellers);
        } else {
          //@ts-ignore
          setError(response.message);
        }
      } catch (error) {
        setError('Грешка при зареждане на продавачите.');
      }
    };

    fetchSellers();
  }, [eventUuid]);

  //@ts-ignore
  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await addSeller({ email, eventUuid });
      if (!response.success) {
        //@ts-ignore
        setError(response.message);
      } else {
        setEmail('');
        // Презареждаме списъка
        const updatedSellers = await getSellers({ eventUuid });
        if (updatedSellers.success) {
          //@ts-ignore
          setSellers(updatedSellers.sellers);
        }
      }
    } catch (error) {
      setError('Грешка при добавяне на продавача.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Форма за добавяне на продавач, само ако не е seller */}
      {!isSeller && (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              className="border p-2 rounded flex-1"
              placeholder="Въведи имейл на продавач"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? '...' : 'Добави'}
            </button>
          </div>
          {error && <p className="text-red-500 mt-1">{error}</p>}
        </form>
      )}

      {/* Таблица на продавачите */}
      {sellers.length === 0 ? (
        <p>Няма продавачи.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Ако е Fasching => показваме подобрената таблица */}
          {isFasching ? (
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Имейл</th>
                  <th className="px-4 py-2 text-left font-semibold">Име</th>
                  <th className="px-4 py-2 text-left font-semibold">Fasching (#)</th>
                  <th className="px-4 py-2 text-left font-semibold">After (#)</th>
                  <th className="px-4 py-2 text-left font-semibold">Upgrades</th>
                  <th className="px-4 py-2 text-left font-semibold">Fasching (лв)</th>
                  <th className="px-4 py-2 text-left font-semibold">After (лв)</th>
                  <th className="px-4 py-2 text-left font-semibold">Общо (лв)</th>
                </tr>
              </thead>
              <tbody>
                {sellers
                  //@ts-ignore
                  .sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))
                  .map((seller, idx) => {
                    return (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2">{seller.sellerEmail}</td>
                        <td className="px-4 py-2">
                          {seller.unregistered
                            ? 'нерегистриран'
                            : `${seller.firstname} ${seller.lastname}`}
                        </td>
                        <td className="px-4 py-2">{seller.faschingPortionCount || 0}</td>
                        <td className="px-4 py-2">{seller.afterPortionCount || 0}</td>
                        <td className="px-4 py-2">{seller.upgradesCount || 0}</td>
                        <td className="px-4 py-2">{(seller.faschingRevenue ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">{(seller.afterRevenue ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2 font-semibold">
                          {(seller.totalRevenue ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            // При не-Fasching (стар тип) -> старата таблица
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Имейл</th>
                  <th className="px-4 py-2 text-left font-semibold">Продадени билети</th>
                  <th className="px-4 py-2 text-left font-semibold">Томбола</th>
                  <th className="px-4 py-2 text-left font-semibold">Дължимо (лв)</th>
                  <th className="px-4 py-2 text-left font-semibold">Резервации</th>
                </tr>
              </thead>
              <tbody>
                {sellers
                  //@ts-ignore
                  .sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0))
                  .map((seller, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">{seller.sellerEmail}{" "}
                        {seller.firstname ? `(${seller.firstname} ${seller.lastname})` : '(нерегистриран)'}
                      </td>
                      <td className="px-4 py-2">{seller.ticketsSold || 0}</td>
                      <td className="px-4 py-2">{seller.tombolaTickets || 0}</td>
                      <td className="px-4 py-2">
                        {seller.unregistered ? 'N/A' : (seller.priceOwed || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{seller.reservations || 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default SellTickets;

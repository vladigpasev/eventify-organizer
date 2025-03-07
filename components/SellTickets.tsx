"use client";
import React, { useState, useEffect } from 'react';
import { addSeller, getSellers } from '@/server/sellers/actions';

function SellTickets({ eventUuid, isSeller }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sellers, setSellers] = useState([]);

  const isFasching = (eventUuid === "956b2e2b-2a48-4f36-a6fa-50d25a2ab94d");

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const response = await getSellers({ eventUuid });
        if (response.success) {
          setSellers(response.sellers);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError('Грешка при зареждане на продавачите.');
      }
    };

    fetchSellers();
  }, [eventUuid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const resp = await addSeller({ email, eventUuid });
      if (!resp.success) {
        setError(resp.message);
      } else {
        setEmail('');
        // Reload
        const updated = await getSellers({ eventUuid });
        if (updated.success) {
          setSellers(updated.sellers);
        }
      }
    } catch (err) {
      setError('Грешка при добавяне на продавач.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!isSeller && (
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="flex gap-2 items-center">
            <input
              type="email"
              className="border p-2 rounded flex-1"
              placeholder="Имейл на нов продавач"
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

      {sellers.length === 0 ? (
        <p>Няма продавачи.</p>
      ) : (
        <div className="overflow-x-auto">
          {isFasching ? (
            // ФАШИНГ ТАБЛИЦА
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Имейл</th>
                  <th className="px-4 py-2 text-left font-semibold">Име</th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Fasching (#)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    After (#)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Upgrades (#)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Fasching (лв)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    After (лв)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Общо билети (лв)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-red-600">
                    Separe (лв)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Grand Total (лв)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellers
                  .sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))
                  .map((seller, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">{seller.sellerEmail}</td>
                      <td className="px-4 py-2">
                        {seller.unregistered
                          ? "нерегистриран"
                          : `${seller.firstname} ${seller.lastname}`}
                      </td>
                      <td className="px-4 py-2">
                        {seller.faschingPortionCount || 0}
                      </td>
                      <td className="px-4 py-2">
                        {seller.afterPortionCount || 0}
                      </td>
                      <td className="px-4 py-2">
                        {seller.upgradesCount || 0}
                      </td>
                      <td className="px-4 py-2">
                        {(seller.faschingRevenue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        {(seller.afterRevenue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {(seller.totalRevenue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 font-semibold text-red-600">
                        {(seller.separeRevenue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 font-semibold text-blue-600">
                        {(seller.grandTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            // НЕ-ФАШИНГ ТАБЛИЦА
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Имейл</th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Продадени билети
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">Томбола</th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Дължимо (лв)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    Резервации
                  </th>
                </tr>
              </thead>
              <tbody>
                {sellers
                  .sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0))
                  .map((seller, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">
                        {seller.sellerEmail}{" "}
                        {seller.firstname
                          ? `(${seller.firstname} ${seller.lastname})`
                          : "(нерегистриран)"}
                      </td>
                      <td className="px-4 py-2">{seller.ticketsSold || 0}</td>
                      <td className="px-4 py-2">{seller.tombolaTickets || 0}</td>
                      <td className="px-4 py-2">
                        {seller.unregistered
                          ? "N/A"
                          : (seller.priceOwed || 0).toFixed(2)}
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

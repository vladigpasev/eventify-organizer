"use client";
import React, { useState, useEffect } from 'react';
import { getTombolaItems } from '@/server/events/add_tombola_item';
import AddTombolaItem from './AddTombolaItem'; // Import the AddItem component

interface UserTableProps {
	eventId: string;
	isSeller: boolean | undefined;
	userUuid: string;
}

interface TombolaItem {
	uuid: string;
	itemName: string;
	winnerUuid: string;
	winnerName: string;
}

const TombolaItemsTable = ({ eventId, isSeller, userUuid }: UserTableProps) => {
	const [items, setItems] = useState<TombolaItem[]>([]);
	const [filteredItems, setFilteredItems] = useState<TombolaItem[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchItems = async () => {
		try {
			setIsLoading(true);
			const itemsResponse = await getTombolaItems(eventId);
			//@ts-ignore
			setItems(itemsResponse);
		} catch (err) {
			console.error('Error fetching items:', err);
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchItems();
	}, [eventId]);

	useEffect(() => {
		const filtered = items.filter(item => {
			const itemName = item.itemName.toLowerCase();
			return itemName.includes(searchTerm.toLowerCase());
		});
		setFilteredItems(filtered);
	}, [searchTerm, items]);

	const totalTombolaItems = items.length;

	if (error) return <p>Error loading items: {error.message}</p>;

	return (
		<div className="bg-white shadow rounded p-4 text-black">
			<div className='flex justify-between items-center'>
				<h2 className="text-xl font-semibold mb-3">Продукти в томбола</h2>
				<div className='flex gap-2 sm:flex-row flex-col'>
					<AddTombolaItem eventId={eventId} onItemAdded={fetchItems} userUuid={userUuid} />
				</div>
			</div>
			{isLoading ? <>Зареждане...</> :
				<>
					<div className="mb-4">
						<span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
							{totalTombolaItems} Продукти в томбола
						</span>
					</div>
					<div className="mb-4">
						<input
							type="text"
							placeholder="Търси"
							className="input border border-gray-200 w-full mb-4"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<div className="overflow-x-auto">
						<table className="table">
							<thead>
								<tr>
									<th></th>
									<th>Име на продукт</th>
									<th>Победител</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item, index) => (
									<tr key={index}>
										<th></th>
										<td>{item.itemName}</td>
										<td>{item.winnerName}</td>
										<th>
										</th>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			}
		</div>
	);
};

export default TombolaItemsTable;

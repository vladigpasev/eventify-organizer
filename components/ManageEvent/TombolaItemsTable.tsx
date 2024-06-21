"use client";
import React, { useState, useEffect } from 'react';
import { getTombolaUsers } from '@/server/events/getUsers';
import TombolaTicketDeactivateBtn from './TombolaTicketDeactivateBtn';

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
	paperTicket: string;
	createdAt: string;
	sellerName: string | null;
	sellerEmail: string | null;
	sellerCurrent: boolean;
	reservation: boolean;
	tombola_weight: number;
}

const TombolaItemsTable = ({ eventId, isSeller, userUuid }: UserTableProps) => {
	const [users, setUsers] = useState<Customer[]>([]);
	const [filteredUsers, setFilteredUsers] = useState<Customer[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchUsers = async () => {
		try {
			setIsLoading(true);
			const userResponse = await getTombolaUsers(eventId);
			//@ts-ignore
			setUsers(userResponse);
		} catch (err) {
			console.error('Error fetching users:', err);
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, [eventId]);

	useEffect(() => {
		const filtered = users.filter(user => {
			const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
			const sellerFullName = user.sellerName ? `${user.sellerName} (${user.sellerEmail})`.toLowerCase() : '';
			const combinedSearch = `${fullName} ${user.email} ${user.paperTicket || ''} ${sellerFullName}`;
			return combinedSearch.includes(searchTerm.toLowerCase());
		});
		setFilteredUsers(filtered);
	}, [searchTerm, users]);
	const totalTombolaTickets = users.reduce((acc, ticket) => {
		//@ts-ignore
		const weight = ticket.tombola_weight ? parseFloat(ticket.tombola_weight) : 0;
		return acc + weight;
	}, 0);
	if (error) return <p>Error loading users: {error.message}</p>;

	return (
		<div className="bg-white shadow rounded p-4 text-black">
			<div className='flex justify-between items-center'>
				<h2 className="text-xl font-semibold mb-3">Продукти в томбола</h2>
			</div>
			{isLoading ? <>Зареждане...</> :
				<>
					<div className="mb-4">
						<span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
							{totalTombolaTickets} Продукти в томбола
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
									<th>Име</th>
									<th>Имейл</th>
									<th>Продавач</th>
									<th>Купени билети</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.map((customer, index) => (
									<tr key={index} className={customer.reservation ? 'bg-blue-100' : ''}>
										<th></th>
										<td>
											<div className="flex items-center">
												<div className="avatar"></div>
												<div>
													<div className={`font-bold ${customer.isEntered ? 'text-yellow-500' : ''}`}>{`${customer.firstname} ${customer.lastname}`}</div>
												</div>
											</div>
										</td>
										<td>{customer.email}</td>
										<td>{customer.sellerName} ({customer.sellerEmail})</td>
										<td>{customer.tombola_weight}</td>
										<th>
											<TombolaTicketDeactivateBtn customerUuid={customer.uuid} disabled={!customer.sellerCurrent && isSeller} />
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
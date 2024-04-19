"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TicketActionsBtn from '@/components/ManageEvent/TicketActionsBtn';
import TicketDeactivateBtn from '@/components/ManageEvent/TicketDeactivateBtn';
import { getUsers } from '@/server/events/getUsers';
import AddCustomer from './AddCustomer';
import CheckTicket from './CheckTickets';
import SendEmailToAll from './SendEmailToAll';

export const maxDuration = 300;

interface UserTableProps {
    eventId: string;
}

interface Customer {
    uuid: string;
    firstname: string;
    lastname: string;
    email: string;
    guestCount: number;
    ticketToken: string;
    isEntered: boolean;
}

const UserTable = ({ eventId }: UserTableProps) => {
    const [users, setUsers] = useState<Customer[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const enteredCount = users.filter(user => user.isEntered).length;

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const userResponse = await getUsers(eventId);
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
            return fullName.includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
        });
        setFilteredUsers(filtered);
    }, [searchTerm, users]);
    
    //if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading users: {error.message}</p>;

    return (
        <div className="bg-white shadow rounded p-4 text-black">
            <div className='flex justify-between items-center'>
                <h2 className="text-xl font-semibold mb-3">Билети</h2>
                <div className='flex gap-2 sm:flex-row flex-col'>
                    <AddCustomer eventId={eventId} onCustomerAdded={fetchUsers} />
                    <CheckTicket eventId={eventId} onEnteredOrExited={fetchUsers}/>
                </div>
            </div>
            {isLoading ? <>Зареждане...</> :
                <>
                    <div><SendEmailToAll eventId={eventId} onCustomerAdded={fetchUsers} /></div>
                    <div className="mb-4">
                        <span className="bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                            {users.length} Билети
                        </span>
                        <span className="bg-green-100 text-green-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-800">
                            {enteredCount} влязли
                        </span>

                    </div>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search users"
                            className="input border border-gray-200 w-full mb-4"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Customer list and management buttons */}

                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>
                                    </th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Guests</th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((customer, index) => (
                                    <tr key={index}>
                                        <th></th>
                                        <td>
                                            <div className="flex items-center ">
                                                <div className="avatar"></div>
                                                <div>
                                                    <div className={`font-bold ${customer.isEntered ? 'text-yellow-500' : ''}`}>{`${customer.firstname} ${customer.lastname}`}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{customer.email}</td>
                                        <td>{customer.guestCount}</td>
                                        <th>
                                            <Link className="btn btn-ghost btn-xs text-black" href={`https://tickets.eventify.bg/` + customer.ticketToken} target='_blank'><svg height="24" viewBox="0 0 1792 1792" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M1024 452l316 316-572 572-316-316zm-211 979l618-618q19-19 19-45t-19-45l-362-362q-18-18-45-18t-45 18l-618 618q-19 19-19 45t19 45l362 362q18 18 45 18t45-18zm889-637l-907 908q-37 37-90.5 37t-90.5-37l-126-126q56-56 56-136t-56-136-136-56-136 56l-125-126q-37-37-37-90.5t37-90.5l907-906q37-37 90.5-37t90.5 37l125 125q-56 56-56 136t56 136 136 56 136-56l126 125q37 37 37 90.5t-37 90.5z" fill='currentColor' /></svg></Link>
                                        </th>
                                        <th><TicketActionsBtn ticketToken={customer.ticketToken} eventId={eventId} onEnteredOrExited={fetchUsers} /></th>
                                        <th>
                                            <TicketDeactivateBtn customerUuid={customer.uuid} />
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

export default UserTable;

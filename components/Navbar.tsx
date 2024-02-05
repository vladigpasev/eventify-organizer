"use client"
import DashboardSvg from '@/public/images/icons/Dashboard'
import InvoicesSvg from '@/public/images/icons/Invoices'
import LogoutSvg from '@/public/images/icons/Logout'
import SettingsSvg from '@/public/images/icons/Settings'
import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation'
import { handleLogout } from '@/server/auth'
import Bars from '@/public/images/icons/Bars'


function Navbar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
    const drawerRef = useRef(null);
    const barsRef = useRef(null);
    const pathname = usePathname();

    useEffect(() => {
        const handleOutsideClick = (event: any) => {
            if (
                isDrawerOpen &&
                drawerRef.current &&
                //@ts-ignore
                !drawerRef.current.contains(event.target) &&
                //@ts-ignore
                !barsRef.current.contains(event.target)
            ) {
                setIsDrawerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isDrawerOpen]);

    // Function to check if the path is active
    const isActive = (path: any) => {
        return pathname === path;
    };

    return (
        <div>
            <div className='pb-16'>
                <div className="fixed navbar bg-base-100 shadow-lg">
                    <div className="flex-1">
                        <div className='lg:hidden flex gap-5 items-center'>
                            {/* Toggle button for the drawer */}
                            <div ref={barsRef} className='pl-2 cursor-pointer' onClick={toggleDrawer}><Bars /></div>
                            <div><Link href="/dashboard"><img src="/logo.svg" alt="Eventify Logo" className='w-32' /></Link></div>
                        </div>
                    </div>
                    <div className="flex-none">
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                                <div className="indicator">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    <span className="badge badge-xs badge-primary indicator-item"></span>
                                </div>
                            </div>
                            <div tabIndex={0} className="mt-3 z-[1] card card-compact dropdown-content w-52 bg-base-100 shadow">
                                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                                    <div className="px-4 py-5 sm:p-6 bg-gray-100">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Notifications</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">You have 8 unread notifications</p>
                                    </div>
                                    <ul className="divide-y divide-gray-200">
                                        <li className="px-4 py-4 bg-white hover:bg-gray-50">
                                            <span className="block text-sm font-medium text-gray-700">Your order has been shipped</span>
                                        </li>
                                        <li className="px-4 py-4 bg-white hover:bg-gray-50">
                                            <span className="block text-sm font-medium text-gray-700">Your account has been updated</span>
                                        </li>
                                    </ul>
                                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                                        <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                            View all notifications
                                        </button>
                                        <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                            Clear all notifications
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <Link href="/settings/profile">
                            <div className="dropdown dropdown-end">
                                <div className="btn btn-ghost btn-circle avatar">
                                    <div className="w-10 rounded-full">
                                        <img alt="Profile picture" src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                    
                </div>
                
            </div>
            

            <div ref={drawerRef} className={`fixed z-50 top-0 supersmall:w-[307px] h-full bg-blue-800 rounded-tr-[20px] rounded-br-[20px] lg:flex flex-col items-center gap-12 ${isDrawerOpen ? 'flex' : 'hidden'}`}>
                <div className='pt-12'>
                    <Link href='/dashboard' className='cursor-pointer'><img className="w-36" src="/logo-white.svg" alt="Logo" /></Link>
                </div>
                <div className='flex flex-col justify-between flex-grow w-full px-4 gap-8'>
                    <div className='w-full flex flex-col gap-7'>
                        <Link href="/dashboard">
                            <div className={`w-full h-14 rounded border flex items-center gap-4 cursor-pointer ${isActive('/dashboard') ? 'bg-white border-gray-100 hover:bg-gray-100' : 'border-transparent hover:bg-white hover:bg-opacity-10'}`}>
                                <div className="flex justify-center items-center pl-2">
                                    <div className={`rounded-full p-2 ${isActive('/dashboard') ? 'bg-white bg-opacity-50 text-blue-800' : 'bg-white bg-opacity-50 text-white'}`}>
                                        <DashboardSvg />
                                    </div>
                                </div>
                                <div className={`w-[93.28px] ${isActive('/dashboard') ? 'text-blue-800' : 'text-white'} text-sm font-medium`}>Dashboard</div>
                            </div>
                        </Link>
                        <Link href="/dashboard/invoices">
                            <div className={`w-full h-14 rounded border flex items-center gap-4 cursor-pointer ${isActive('/dashboard/invoices') ? 'bg-white border-gray-100 hover:bg-gray-100' : 'border-transparent hover:bg-white hover:bg-opacity-10'}`}>
                                <div className="flex justify-center items-center pl-2">
                                    <div className={`rounded-full p-2 ${isActive('/dashboard/invoices') ? 'bg-white bg-opacity-50 text-blue-800' : 'bg-white bg-opacity-50 text-white'}`}>
                                        <InvoicesSvg />
                                    </div>
                                </div>
                                <div className={`w-[93.28px] ${isActive('/dashboard/invoices') ? 'text-blue-800' : 'text-white'} text-sm font-medium`}>Invoices</div>
                            </div>
                        </Link>
                        <Link href="/dashboard/settings">
                            <div className={`w-full h-14 rounded border flex items-center gap-4 cursor-pointer ${isActive('/dashboard/settings') ? 'bg-white border-gray-100 hover:bg-gray-100' : 'border-transparent hover:bg-white hover:bg-opacity-10'}`}>
                                <div className="flex justify-center items-center pl-2">
                                    <div className={`rounded-full p-2 ${isActive('/dashboard/settings') ? 'bg-white bg-opacity-50 text-blue-800' : 'bg-white bg-opacity-50 text-white'}`}>
                                        <SettingsSvg />
                                    </div>
                                </div>
                                <div className={`w-[93.28px] ${isActive('/dashboard/settings') ? 'text-blue-800' : 'text-white'} text-sm font-medium`}>Settings</div>
                            </div>
                        </Link>
                    </div>
                    <div className='w-full flex flex-col gap-7 mb-5'>
                        <form action={handleLogout}>
                            <button type='submit' className='w-full'>
                                <div className={`w-full h-14 rounded border flex items-center gap-4 cursor-pointer ${isActive('/logout') ? 'bg-white border-gray-100 hover:bg-gray-100' : 'border-transparent hover:bg-white hover:bg-opacity-10'}`}>
                                    <div className="flex justify-center items-center pl-2">
                                        <div className={`rounded-full p-2 ${isActive('/logout') ? 'bg-white bg-opacity-50 text-blue-800' : 'bg-white bg-opacity-50 text-white'}`}>
                                            <LogoutSvg />
                                        </div>
                                    </div>
                                    <div className={`w-[93.28px] ${isActive('/logout') ? 'text-blue-800' : 'text-white'} text-sm font-medium`}>Log out</div>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Navbar
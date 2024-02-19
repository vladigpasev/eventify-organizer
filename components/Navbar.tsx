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
import MyPlan from './MyPlan'
import { manageAccount } from '@/server/payment/plan'


function Navbar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isMyPlanOpen, setIsMyPlanOpen] = useState(false); // State for MyPlan popup
    const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
    const toggleMyPlan = () => setIsMyPlanOpen(!isMyPlanOpen); // Function to toggle MyPlan popup
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
            <div className='pb-16 z-40'>
                <div className="fixed navbar bg-base-100 shadow-lg z-40">
                    <div className="flex-1">
                        <div className='lg:hidden flex gap-5 items-center'>
                            {/* Toggle button for the drawer */}
                            <div ref={barsRef} className='pl-2 cursor-pointer' onClick={toggleDrawer}><Bars /></div>
                            <div><Link href="/dashboard"><img src="/logo.svg" alt="Eventify Logo" className='w-32' /></Link></div>
                        </div>
                    </div>
                    <div className="flex-none">
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                                <div className="w-10 rounded-full">
                                    <img alt="Tailwind CSS Navbar component" src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" />
                                </div>
                            </div>
                            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                                <li><a onClick={toggleMyPlan}>My plan</a></li>
                                <form action={manageAccount} className='w-full'>
                                    <button type="submit" className='w-full'><li><a>Billing settings</a></li></button>
                                </form>
                                <form action={handleLogout} className='w-full'><button type='submit' className='w-full'> <li><a>Logout</a></li></button></form>
                            </ul>
                        </div>
                    </div>

                </div>

            </div>

            {isMyPlanOpen && <MyPlan onClose={() => setIsMyPlanOpen(false)} />}

            <div ref={drawerRef} className={`fixed z-40 top-0 supersmall:w-[307px] h-full bg-blue-800 rounded-tr-[20px] rounded-br-[20px] lg:flex flex-col items-center gap-12 ${isDrawerOpen ? 'flex' : 'hidden'}`}>
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
                        <form action={manageAccount} className={`w-full`}><button type='submit' className='w-full'>
                            <div className={`w-full h-14 rounded border flex items-center cursor-pointer ${isActive('/dashboard/invoices') ? 'bg-white border-gray-100 hover:bg-gray-100' : 'border-transparent hover:bg-white hover:bg-opacity-10'}`}>
                                <div className="flex justify-center items-center pl-2">
                                    <div className={`rounded-full p-2 ${isActive('/dashboard/invoices') ? 'bg-white bg-opacity-50 text-blue-800' : 'bg-white bg-opacity-50 text-white'}`}>
                                        <InvoicesSvg />
                                    </div>
                                </div>
                                <div className={`w-[93.28px] ${isActive('/dashboard/invoices') ? 'text-blue-800' : 'text-white'} text-sm font-medium`}>Invoices</div>
                            </div>
                        </button></form>
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
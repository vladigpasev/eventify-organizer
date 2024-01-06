"use client"
import { handleLogout } from '@/server/auth'
import React from 'react'

function LogoutBtn() {
    return (
        <form action={handleLogout}>
            <button
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" type='submit'>
                Logout
            </button>
        </form>
    )
}

export default LogoutBtn
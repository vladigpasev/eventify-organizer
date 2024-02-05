import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import Navbar from '@/components/Navbar'
import PayoutWarning from '@/components/PayoutWarning'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Eventify Organizer Dashboard',
    description: 'Wellcome to Eventify Organizer! Here you can create your own events, that can be seen from other users and the perfect target audience.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Navbar />
                <div className='main-content'>
                    <PayoutWarning />
                    {children}
                </div>
            </body>
        </html>
    )
}

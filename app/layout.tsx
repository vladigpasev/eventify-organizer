//Copyright (C) 2024  Vladimir Pasev
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import type { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

 
export const viewport: Viewport = {
  width: 'device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
}

export const metadata: Metadata = {
  title: 'Eventify Organizer',
  description: 'Wellcome to Eventify Organizer! Here you can create your own events, that can be seen from other users and the perfect target audience.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import PayoutWarning from "@/components/PayoutWarning";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Организатор на Eventify",
  description:
    "Добре дошли в Eventify Organizer! Тук можете да създавате свои собствени събития, които могат да бъдат видени от други потребители и перфектната целева аудитория.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <div className="main-content">
          <PayoutWarning />
          {children}
        </div>
      </body>
    </html>
  );
}

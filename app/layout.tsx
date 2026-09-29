import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homestay Harga Dinamis",
  description: "Manajemen homestay/villa dengan harga dinamis, kalender ketersediaan, dan sinkronisasi iCal",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/unit", label: "Unit" },
  { href: "/booking", label: "Booking" },
  { href: "/kalender", label: "Kalender" },
  { href: "/harga", label: "Harga & Liburan" },
  { href: "/ical", label: "Sinkronisasi iCal" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-amber-50/60 text-slate-900">
        <header className="border-b border-amber-200 bg-amber-100/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-950">Homestay Harga Dinamis</h1>
              <p className="text-xs text-amber-900/70">Kelola villa, harga musiman, dan ketersediaan</p>
            </div>
            <nav className="flex flex-wrap gap-1">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-200/70"
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

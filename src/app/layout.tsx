import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ControlApps Clientes",
  description: "Base de datos comercial para prospectos, clientes e interacciones."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/" className="brand">
              ControlApps Clientes
            </Link>
            <nav className="topnav" aria-label="Principal">
              <Link href="/brief" className="topnav__link">
                Brief
              </Link>
              <Link href="/" className="topnav__link">
                Clientes
              </Link>
              <Link href="/agenda" className="topnav__link">
                Agenda
              </Link>
            </nav>
          </header>

          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}

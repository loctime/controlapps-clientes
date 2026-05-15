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
          </header>

          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}

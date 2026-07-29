import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}

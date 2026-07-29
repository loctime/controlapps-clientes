import Link from "next/link";
import { logout } from "@/app/auth-actions";

export default function PanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/programas" className="brand">
          ControlApps Clientes
        </Link>
        <nav className="topnav" aria-label="Principal">
          <Link href="/brief" className="topnav__link">
            Brief
          </Link>
          <Link href="/programas" className="topnav__link">
            Programas
          </Link>
          <Link href="/historial" className="topnav__link">
            Historial
          </Link>
          <Link href="/agenda" className="topnav__link">
            Agenda
          </Link>
          <form action={logout}>
            <button type="submit" className="topnav__link topnav__link--logout">
              Salir
            </button>
          </form>
        </nav>
      </header>

      <main className="content">{children}</main>
    </div>
  );
}

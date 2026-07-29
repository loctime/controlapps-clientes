import { login } from "@/app/auth-actions";
import { getPanelPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(getPanelPassword());
  const next = params.next ?? "/";

  return (
    <div className="login-page">
      <form className="login-card" action={login}>
        <h1>ControlApps Clientes</h1>
        <p className="login-hint">Panel privado. Ingresá la clave de acceso.</p>

        <input type="hidden" name="next" value={next} />
        <input
          className="login-input"
          type="password"
          name="password"
          placeholder="Clave"
          autoComplete="current-password"
          autoFocus
          required
          disabled={!configured}
        />

        {!configured || params.error === "config" ? (
          <p className="login-error">
            Falta definir <code>PANEL_PASSWORD</code> en el entorno del servidor.
          </p>
        ) : null}

        {params.error === "1" ? <p className="login-error">Clave incorrecta.</p> : null}

        <button className="login-button" type="submit" disabled={!configured}>
          Entrar
        </button>
      </form>
    </div>
  );
}

// Smoke test de la auth y las pantallas privadas: firma una cookie de sesión
// válida con el PANEL_SECRET del entorno y pega contra el server local.
// Uso: node scripts/smoke-auth.js [http://localhost:3200]

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "http://localhost:3200";
const ENV_PATH = path.join(__dirname, "..", ".env");

function readEnv(key) {
  if (process.env[key]) return process.env[key];

  const line = fs
    .readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .find((row) => row.startsWith(`${key}=`));

  return line ? line.slice(key.length + 1).trim().replace(/^"|"$/g, "") : null;
}

const password = readEnv("PANEL_PASSWORD");
const secret = readEnv("PANEL_SECRET") || `fallback:${password ?? ""}`;

const payload = String(Date.now() + 60_000);
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
const cookie = `clientes_session=${payload}.${signature}`;

async function check(pathname, headers) {
  const response = await fetch(`${BASE}${pathname}`, { headers, redirect: "manual" });
  const body = response.status === 200 ? await response.text() : "";

  return { status: response.status, location: response.headers.get("location"), body };
}

async function main() {
  const sinCookie = await check("/programas", {});
  console.log(`sin cookie   /programas -> ${sinCookie.status} ${sinCookie.location ?? ""}`);

  const conCookie = await check("/programas", { cookie });
  console.log(`con sesion   /programas -> ${conCookie.status}`);

  for (const marker of ["Programas y cobros", "Quién me debe", "VENTAMAT", "HABANEROS"]) {
    console.log(`  ${conCookie.body.includes(marker) ? "ok" : "FALTA"}  ${marker}`);
  }

  const portada = await check("/", { cookie });
  console.log(`con sesion   /          -> ${portada.status} ${portada.location ?? ""}`);

  for (const route of ["/empresas", "/brief", "/agenda"]) {
    const page = await check(route, { cookie });
    console.log(`con sesion   ${route} -> ${page.status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

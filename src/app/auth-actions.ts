"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, SESSION_DAYS, createSessionToken, getPanelPassword } from "@/lib/auth";

function safeNext(value: string) {
  // Solo rutas internas: evita que ?next= sirva de redirect abierto.
  if (!value.startsWith("/") || value.startsWith("//")) return "/programas";
  return value;
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/programas"));
  const expected = getPanelPassword();

  if (!expected) {
    redirect("/login?error=config");
  }

  if (password !== expected) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set(AUTH_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });

  redirect(next);
}

export async function logout() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);

  redirect("/login");
}

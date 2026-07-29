import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (await verifySessionToken(token)) {
    // La portada es Programas: el listado de empresas quedó en /empresas y ya
    // no se muestra en el menú.
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/programas", request.url));
    }

    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (target && target !== "/") {
    loginUrl.searchParams.set("next", target);
  }

  const response = NextResponse.redirect(loginUrl);
  if (token) {
    response.cookies.delete(AUTH_COOKIE);
  }

  return response;
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"]
};

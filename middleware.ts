import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const ADMIN_LOGIN = "/admin/login";
const USER_LOGIN = "/login";

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request);

  // getUser() 호출 자체가 만료 토큰 refresh를 트리거한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAdmin =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === ADMIN_LOGIN;
  const needsUser =
    pathname === "/investments" || pathname.startsWith("/investments/");

  if (needsAdmin && !isAdminLogin) {
    if (!user) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
  }

  if (needsUser && !user) {
    return NextResponse.redirect(new URL(USER_LOGIN, request.url));
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

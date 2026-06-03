import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 미들웨어 전용 Supabase 클라이언트 + 응답을 함께 돌려준다.
 * setAll 콜백이 response를 재할당하므로, 호출자는 getResponse()를 통해
 * 최종 응답을 얻어야 한다(쿼리 도중 갱신된 쿠키가 반영됨).
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, getResponse: () => response };
}

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request);
  await supabase.auth.getUser();
  return getResponse();
}

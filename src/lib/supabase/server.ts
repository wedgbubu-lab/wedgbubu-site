// 서버 전용 헬퍼. SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 금지, 클라이언트 번들 금지.
// 일반 요청은 anon 키 + 쿠키 세션을 쓰고, RLS를 우회해야 할 때만 service_role을 별도 헬퍼로 분리한다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component에서는 set이 불가 — middleware가 세션을 갱신한다.
          }
        },
      },
    },
  );
}

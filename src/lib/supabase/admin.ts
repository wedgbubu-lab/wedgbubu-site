import "server-only";
import { createClient } from "@supabase/supabase-js";

// SUPABASE_SERVICE_ROLE_KEY는 RLS를 우회한다.
// NEXT_PUBLIC_ 금지, 클라이언트 번들 금지. 서버 액션 / route handler / cron에서만 사용.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

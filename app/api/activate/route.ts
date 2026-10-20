import { handleActivation } from "@/lib/supabase/auth/activation-handler";

export async function POST(request: Request) {
  return handleActivation(request);
}

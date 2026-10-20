import { requireAuthenticatedAdmin } from "@/lib/supabase/auth/guard";
import ReturnsDeskClient from "./ReturnsDeskClient";

export const instant = false;

export default async function ReturnsDeskPage() {
  const admin = await requireAuthenticatedAdmin();
  return <ReturnsDeskClient admin={admin} />;
}

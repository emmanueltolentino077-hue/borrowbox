import { requireAuthenticatedAdmin } from "@/lib/supabase/auth/guard";
import NewBorrowClient from "./NewBorrowClient";

export const instant = false;

export default async function NewBorrowPage() {
  const admin = await requireAuthenticatedAdmin();
  return <NewBorrowClient admin={admin} />;
}

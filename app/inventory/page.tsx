import { requireAuthenticatedAdmin } from "@/lib/supabase/auth/guard";
import InventoryClient from "./InventoryClient";

export const instant = false;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string }>;
}) {
  // Server guard ensures caller is authenticated and must_change_credentials is false
  const admin = await requireAuthenticatedAdmin();
  const resolvedParams = searchParams ? await searchParams : {};

  return <InventoryClient admin={admin} initialOpenAdd={resolvedParams.action === "add"} />;
}

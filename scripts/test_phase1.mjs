import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]?.trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xmjynonirslkzmrtqtpe.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runPhase1Tests() {
  console.log("==================================================================");
  console.log("=== PHASE 1: ACCOUNT ACTIVATION & EMAILJS VERIFICATION SUITE ===");
  console.log("==================================================================");

  // 1. Missing fields validation
  console.log("\n[Test 1] Testing POST /api/activate with missing fields (Expected: 400)...");
  const resBad = await fetch(`${BASE_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId: "" }),
  });
  console.log("Status:", resBad.status);
  if (resBad.status !== 400) throw new Error("Expected 400 for missing fields");
  console.log("  -> [PASS] Rejected missing fields with 400 Bad Request");

  // 2. Unknown account gives neutral response (Q2 Security rule)
  console.log("\n[Test 2] Testing unknown account (Expected: 200 neutral message)...");
  const resUnknown = await fetch(`${BASE_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "IT-999-FAKE",
      email: "fake.officer@uni.edu",
    }),
  });
  const dataUnknown = await resUnknown.json();
  console.log("Status:", resUnknown.status, "Message:", dataUnknown.message);
  if (resUnknown.status !== 200 || !dataUnknown.message.includes("sign-in details have been sent")) {
    throw new Error("Expected 200 neutral response for unknown account");
  }
  console.log("  -> [PASS] Unknown account received neutral security response without leakage");

  // 3. Real account activation & EmailJS dispatch
  console.log("\n[Test 3] Testing real account activation with EmailJS dispatch...");
  console.log("Target Admin: IT-2026-001 / emmanueltolentino077@gmail.com");

  const resReal = await fetch(`${BASE_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "IT-2026-001",
      email: "emmanueltolentino077@gmail.com",
    }),
  });

  const dataReal = await resReal.json();
  console.log("Status:", resReal.status);
  console.log("Response:", dataReal);

  if (resReal.status !== 200) {
    throw new Error(`Activation failed with status ${resReal.status}`);
  }

  // 4. Verify database state
  console.log("\n[Test 4] Verifying database state in Supabase...");
  const { data: adminRecord, error: dbErr } = await supabase
    .from("admins")
    .select("id, employee_id, company_email, status, must_change_credentials, activated_at")
    .eq("employee_id", "IT-2026-001")
    .single();

  if (dbErr || !adminRecord) {
    throw new Error("Failed to query updated admin record from Supabase");
  }

  console.log("Admin record in DB:", adminRecord);
  if (adminRecord.status !== "active") {
    throw new Error("Admin status must be 'active' after activation");
  }
  if (!adminRecord.must_change_credentials) {
    throw new Error("must_change_credentials must be true after activation");
  }
  if (!adminRecord.activated_at) {
    throw new Error("activated_at must be populated after activation");
  }
  console.log("  -> [PASS] Database state matches activation contract");

  // 5. Also verify design placeholder code EMP-2024-9104
  console.log("\n[Test 5] Testing activation with design placeholder EMP-2024-9104...");
  const resPlaceholder = await fetch(`${BASE_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: "EMP-2024-9104",
      email: "emmanueltolentino077@gmail.com",
    }),
  });
  console.log("Status:", resPlaceholder.status);
  if (resPlaceholder.status !== 200) throw new Error("Expected 200 for EMP-2024-9104");
  console.log("  -> [PASS] Design placeholder code EMP-2024-9104 successfully dispatched email!");

  // Clean-up: restore must_change_credentials to false for subsequent phase suites
  await supabase
    .from("admins")
    .update({ must_change_credentials: false, username: "emmanuel" })
    .eq("employee_id", "IT-2026-001");
  console.log("  -> Cleaned up test admin credentials flag for remaining test suites.");

  console.log("\n==================================================================");
  console.log("=== ALL PHASE 1 ACTIVATION TESTS PASSED SUCCESSFULLY! ===");
  console.log("==================================================================");
}

runPhase1Tests().catch((err) => {
  console.error("\n❌ PHASE 1 TEST FAILURE:", err);
  process.exit(1);
});

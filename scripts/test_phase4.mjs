import { SignJWT } from "jose";
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
const SESSION_SECRET = process.env.SESSION_SECRET || "default_test_session_secret_32_characters_long_min";

async function createSessionCookie(admin) {
  const secretKey = new TextEncoder().encode(SESSION_SECRET);
  const token = await new SignJWT({
    adminId: admin.id,
    username: admin.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
  return `borrowbox_session=${token}`;
}

async function runPhase4Tests() {
  console.log("=== PHASE 4: NEW BORROW AUTOMATED VERIFICATION ===");

  const adminSession = {
    id: "9cfe159e-f867-487d-8532-2d56c3121ee4",
    employee_id: "IT-2026-001",
    company_email: "emmanueltolentino077@gmail.com",
    full_name: "Emmanuel Tolentino",
    username: "emmanuel",
    must_change_credentials: false,
  };

  const cookie = await createSessionCookie(adminSession);
  const headers = {
    Cookie: cookie,
    "Content-Type": "application/json",
  };

  // ------------------------------------------------------------------
  // 1. Borrower Search
  // ------------------------------------------------------------------
  console.log("\n[Test 1] Testing GET /api/borrowers/search (Default list)...");
  const res1 = await fetch(`${BASE_URL}/api/borrowers/search`, { headers });
  const data1 = await res1.json();
  console.log("Status:", res1.status, "Count:", data1.borrowers?.length);
  if (!res1.ok || !data1.borrowers || data1.borrowers.length === 0) {
    throw new Error("Test 1 Failed: Expected borrowers list");
  }

  console.log("\n[Test 2] Testing Borrower Search by Name ('Santos')...");
  const res2 = await fetch(`${BASE_URL}/api/borrowers/search?q=Santos`, { headers });
  const data2 = await res2.json();
  console.log("Status:", res2.status, "Found:", data2.borrowers?.map((b) => b.full_name));
  const hasSantos = data2.borrowers?.some((b) => b.full_name.includes("Santos"));
  if (!res2.ok || !hasSantos) {
    throw new Error("Test 2 Failed: Did not find 'Santos'");
  }
  const borrower = data2.borrowers[0];

  console.log("\n[Test 3] Testing Borrower Search by Code ('STU-2026-001')...");
  const res3 = await fetch(`${BASE_URL}/api/borrowers/search?q=STU-2026-001`, { headers });
  const data3 = await res3.json();
  console.log("Status:", res3.status, "Code:", data3.borrowers?.[0]?.borrower_code);
  if (!res3.ok || data3.borrowers?.[0]?.borrower_code !== "STU-2026-001") {
    throw new Error("Test 3 Failed: Search by borrower code mismatch");
  }

  // ------------------------------------------------------------------
  // 2. Available Catalog Fetching (6 items per page)
  // ------------------------------------------------------------------
  console.log("\n[Test 4] Testing Catalog GET /api/equipment (limit=6)...");
  const res4 = await fetch(`${BASE_URL}/api/equipment?limit=6&page=1`, { headers });
  const data4 = await res4.json();
  console.log("Status:", res4.status, "Items count:", data4.items?.length);
  if (!res4.ok || data4.items?.length !== 6) {
    throw new Error("Test 4 Failed: Expected 6 catalog items");
  }
  const item1 = data4.items.find((i) => i.available_units > 1);
  const item2 = data4.items.find((i) => i.id !== item1?.id && i.available_units > 0);
  if (!item1 || !item2) {
    throw new Error("Test 4 Failed: Could not find two available items for testing");
  }
  console.log(`Test items: ${item1.name} (avail: ${item1.available_units}), ${item2.name} (avail: ${item2.available_units})`);

  // ------------------------------------------------------------------
  // 3. POST /api/borrows Validations
  // ------------------------------------------------------------------
  console.log("\n[Test 5] Testing POST /api/borrows (Missing borrower -> 400)...");
  const res5 = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      borrower_id: "",
      items: [{ equipment_id: item1.id, quantity: 1 }],
      due_option: "3days",
    }),
  });
  console.log("Status:", res5.status);
  if (res5.status !== 400) throw new Error("Test 5 Failed: Expected 400 for missing borrower");

  console.log("\n[Test 6] Testing POST /api/borrows (Empty tray -> 400)...");
  const res6 = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      borrower_id: borrower.id,
      items: [],
      due_option: "3days",
    }),
  });
  console.log("Status:", res6.status);
  if (res6.status !== 400) throw new Error("Test 6 Failed: Expected 400 for empty tray");

  console.log("\n[Test 7] Testing POST /api/borrows (Past/Today Custom Date -> 400)...");
  const todayStr = new Date().toISOString().split("T")[0];
  const res7 = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      borrower_id: borrower.id,
      items: [{ equipment_id: item1.id, quantity: 1 }],
      due_option: "custom",
      custom_due_date: todayStr, // Today is rejected per Q22 (must be at least tomorrow)
    }),
  });
  const data7 = await res7.json();
  console.log("Status:", res7.status, data7.message);
  if (res7.status !== 400) throw new Error("Test 7 Failed: Expected 400 for today/past date");

  // ------------------------------------------------------------------
  // 4. Stock Conflict Check (Q19, Q20)
  // ------------------------------------------------------------------
  console.log("\n[Test 8] Testing Stock Conflict (Requested > Available -> 409)...");
  const res8 = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      borrower_id: borrower.id,
      items: [{ equipment_id: item1.id, quantity: item1.available_units + 50 }],
      due_option: "3days",
    }),
  });
  const data8 = await res8.json();
  console.log("Status:", res8.status, "Message:", data8.message);
  if (res8.status !== 409 || !data8.message.includes("Not enough stock")) {
    throw new Error("Test 8 Failed: Expected 409 Conflict with shortage message");
  }

  // ------------------------------------------------------------------
  // 5. Successful Multi-Item Borrow (Q13, Q15, Q22)
  // ------------------------------------------------------------------
  console.log("\n[Test 9] Testing Valid Multi-Item Borrow Issue (3 Days)...");
  const beforeAvail1 = item1.available_units;
  const beforeAvail2 = item2.available_units;

  const res9 = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      borrower_id: borrower.id,
      items: [
        { equipment_id: item1.id, quantity: 1 },
        { equipment_id: item2.id, quantity: 1 },
      ],
      due_option: "3days",
    }),
  });
  const data9 = await res9.json();
  console.log("Status:", res9.status, "Loan Code:", data9.loan_code, "Due At:", data9.due_at);
  if (!res9.ok || !data9.borrow_id || !data9.loan_code) {
    throw new Error("Test 9 Failed: Could not issue borrow");
  }

  // ------------------------------------------------------------------
  // 6. Verify Stock Decrement in Inventory
  // ------------------------------------------------------------------
  console.log("\n[Test 10] Verifying Equipment Available Stock Deductions...");
  const res10 = await fetch(`${BASE_URL}/api/equipment?limit=50`, { headers });
  const data10 = await res10.json();
  const afterItem1 = data10.items.find((i) => i.id === item1.id);
  const afterItem2 = data10.items.find((i) => i.id === item2.id);

  console.log(`${item1.name}: Before = ${beforeAvail1}, After = ${afterItem1?.available_units}`);
  console.log(`${item2.name}: Before = ${beforeAvail2}, After = ${afterItem2?.available_units}`);

  if (afterItem1?.available_units !== beforeAvail1 - 1 || afterItem2?.available_units !== beforeAvail2 - 1) {
    throw new Error("Test 10 Failed: Available units were not decremented by 1");
  }

  // ------------------------------------------------------------------
  // 7. Due Date Verification (17:00 Asia/Manila)
  // ------------------------------------------------------------------
  console.log("\n[Test 11] Verifying Due Date at 17:00 Asia/Manila (09:00 UTC)...");
  const dueDate = new Date(data9.due_at);
  console.log("Due Date UTC:", dueDate.toISOString());
  // 17:00 Asia/Manila corresponds to 09:00 UTC (or matching offset)
  const utcHours = dueDate.getUTCHours();
  console.log("UTC Hours:", utcHours);
  if (utcHours !== 9) {
    throw new Error(`Test 11 Failed: Expected 09:00 UTC (17:00 Manila), got ${utcHours}:00 UTC`);
  }

  console.log("\n=========================================================");
  console.log(">>> ALL 11 PHASE 4 VERIFICATION TESTS PASSED! <<<");
  console.log("=========================================================");
}

runPhase4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

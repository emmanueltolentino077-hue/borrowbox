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

async function runPhase5Tests() {
  console.log("=== PHASE 5: RETURNS DESK AUTOMATED VERIFICATION ===");

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
  // 1. GET /api/borrows (Default list & 4 metric cards)
  // ------------------------------------------------------------------
  console.log("\n[Test 1] Testing GET /api/borrows (Default list & stats)...");
  const res1 = await fetch(`${BASE_URL}/api/borrows`, { headers });
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Stats:", data1.stats);
  console.log("Pagination:", data1.pagination);
  console.log("Total items returned on page:", data1.items?.length);

  if (!res1.ok || !data1.items || data1.items.length === 0) {
    throw new Error("Test 1 Failed: Expected borrows list and 200 OK");
  }

  const { allActiveBorrows, dueToday, overdue, returnedToday } = data1.stats;
  console.log(`Cards -> All Active: ${allActiveBorrows}, Due Today: ${dueToday}, Overdue: ${overdue}, Returned Today: ${returnedToday}`);

  // ------------------------------------------------------------------
  // 2. Search & Filter Testing
  // ------------------------------------------------------------------
  console.log("\n[Test 2] Testing Search by Borrower ('Santos')...");
  const res2 = await fetch(`${BASE_URL}/api/borrows?search=Santos`, { headers });
  const data2 = await res2.json();
  console.log("Found matches:", data2.items?.length);
  const allSantos = data2.items.every((b) => b.borrower?.full_name.includes("Santos"));
  if (!res2.ok || !allSantos || data2.items.length === 0) {
    throw new Error("Test 2 Failed: Search by borrower failed");
  }

  console.log("\n[Test 3] Testing Department Filter ('CECT')...");
  const res3 = await fetch(`${BASE_URL}/api/borrows?department=CECT`, { headers });
  const data3 = await res3.json();
  console.log("CECT Borrows:", data3.items?.length);
  const allCECT = data3.items.every((b) => b.borrower?.department_code === "CECT");
  if (!res3.ok || !allCECT) {
    throw new Error("Test 3 Failed: Department filter mismatch");
  }

  console.log("\n[Test 4] Testing Status Filter ('Active')...");
  const res4 = await fetch(`${BASE_URL}/api/borrows?status=Active`, { headers });
  const data4 = await res4.json();
  console.log("Active Borrows:", data4.items?.length);
  const allActive = data4.items.every((b) => b.status === "Active");
  if (!res4.ok || !allActive) {
    throw new Error("Test 4 Failed: Status filter mismatch");
  }

  // ------------------------------------------------------------------
  // 3. GET /api/borrows/[id]/items (View Items Checklist)
  // ------------------------------------------------------------------
  const targetBorrow = data1.items.find((b) => b.status !== "Returned" && b.borrow_items?.length > 0);
  if (!targetBorrow) {
    throw new Error("Could not find an unreturned borrow with items for testing");
  }

  console.log(`\n[Test 5] Testing GET /api/borrows/[id]/items for borrow ${targetBorrow.loan_code}...`);
  const res5 = await fetch(`${BASE_URL}/api/borrows/${targetBorrow.id}/items`, { headers });
  const data5 = await res5.json();
  console.log("Status:", res5.status);
  console.log("Borrower:", data5.borrow?.borrower?.full_name);
  console.log("Items in manifest:", data5.borrow?.items?.length);
  if (!res5.ok || !data5.borrow?.items || data5.borrow.items.length === 0) {
    throw new Error("Test 5 Failed: Could not get borrow items manifest");
  }
  const testItem = data5.borrow.items[0];

  // ------------------------------------------------------------------
  // 4. Return Borrow & Stock Restoration (Q26, Q28)
  // ------------------------------------------------------------------
  console.log(`\n[Test 6] Testing POST /api/borrows/[id]/return for ${targetBorrow.loan_code}...`);

  // Check current stock of the equipment before return
  const eqResBefore = await fetch(`${BASE_URL}/api/equipment?limit=50`, { headers });
  const eqDataBefore = await eqResBefore.json();
  const eqBefore = eqDataBefore.items.find((i) => i.id === testItem.equipment_id);
  const beforeStock = eqBefore ? eqBefore.available_units : 0;
  console.log(`Equipment ${testItem.name} stock BEFORE return: ${beforeStock}`);

  const returnRes = await fetch(`${BASE_URL}/api/borrows/${targetBorrow.id}/return`, {
    method: "POST",
    headers,
  });
  const returnData = await returnRes.json();
  console.log("Return Status:", returnRes.status, returnData.message);
  if (!returnRes.ok) {
    throw new Error(`Test 6 Failed: Return failed with message: ${returnData.message}`);
  }

  // ------------------------------------------------------------------
  // 5. Verify Equipment Stock Restored Exactly
  // ------------------------------------------------------------------
  console.log("\n[Test 7] Verifying equipment stock restored in inventory...");
  const eqResAfter = await fetch(`${BASE_URL}/api/equipment?limit=50`, { headers });
  const eqDataAfter = await eqResAfter.json();
  const eqAfter = eqDataAfter.items.find((i) => i.id === testItem.equipment_id);
  console.log(`Equipment ${testItem.name} stock AFTER return: ${eqAfter?.available_units}`);
  if (eqAfter?.available_units !== beforeStock + testItem.quantity) {
    throw new Error(
      `Test 7 Failed: Expected stock ${beforeStock + testItem.quantity}, got ${eqAfter?.available_units}`
    );
  }

  // ------------------------------------------------------------------
  // 6. Double-Return / Concurrency Test (Q27: "Already returned")
  // ------------------------------------------------------------------
  console.log("\n[Test 8] Testing Q27: Double-click return protection (Expected 409 Conflict)...");
  const secondReturnRes = await fetch(`${BASE_URL}/api/borrows/${targetBorrow.id}/return`, {
    method: "POST",
    headers,
  });
  const secondReturnData = await secondReturnRes.json();
  console.log("Second return status:", secondReturnRes.status, secondReturnData.message);
  if (secondReturnRes.status !== 409 || !secondReturnData.message.includes("Already returned")) {
    throw new Error("Test 8 Failed: Expected 409 'Already returned.' on duplicate return request");
  }

  // Verify stock was NOT incremented a second time
  const eqResAfterDouble = await fetch(`${BASE_URL}/api/equipment?limit=50`, { headers });
  const eqDataAfterDouble = await eqResAfterDouble.json();
  const eqAfterDouble = eqDataAfterDouble.items.find((i) => i.id === testItem.equipment_id);
  if (eqAfterDouble?.available_units !== beforeStock + testItem.quantity) {
    throw new Error("Test 8 Failed: Stock was erroneously incremented again on double return!");
  }
  console.log("Stock remains consistent after double return attempt!");

  // ------------------------------------------------------------------
  // 7. Verify Metrics Updated (All Active down by 1, Returned Today up by 1)
  // ------------------------------------------------------------------
  console.log("\n[Test 9] Verifying updated Returns Desk card metrics...");
  const res9 = await fetch(`${BASE_URL}/api/borrows`, { headers });
  const data9 = await res9.json();
  console.log(`Before -> Active: ${allActiveBorrows}, Returned Today: ${returnedToday}`);
  console.log(`After  -> Active: ${data9.stats.allActiveBorrows}, Returned Today: ${data9.stats.returnedToday}`);
  if (data9.stats.allActiveBorrows !== allActiveBorrows - 1) {
    throw new Error("Test 9 Failed: allActiveBorrows did not decrement by 1");
  }
  if (data9.stats.returnedToday !== returnedToday + 1) {
    throw new Error("Test 9 Failed: returnedToday did not increment by 1");
  }

  console.log("\n=========================================================");
  console.log(">>> ALL 9 PHASE 5 VERIFICATION TESTS PASSED! <<<");
  console.log("=========================================================");
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

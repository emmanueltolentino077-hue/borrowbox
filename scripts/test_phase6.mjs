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

async function runPhase6Tests() {
  console.log("==========================================================");
  console.log("=== PHASE 6: DASHBOARD AUTOMATED VERIFICATION SUITE ===");
  console.log("==========================================================");

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
  // 1. GET /api/dashboard (Authentication & Response structure)
  // ------------------------------------------------------------------
  console.log("\n[Test 1] Testing GET /api/dashboard with valid admin session...");
  const res1 = await fetch(`${BASE_URL}/api/dashboard`, { headers });
  const data1 = await res1.json();

  console.log("Status Code:", res1.status);
  console.log("Dashboard Stats:", JSON.stringify(data1.stats, null, 2));
  console.log("Latest Borrows Count:", data1.latestBorrows?.length);

  if (!res1.ok || !data1.ok) {
    throw new Error(`Test 1 Failed: Expected 200 OK and ok:true, got ${res1.status}`);
  }

  const {
    totalInventoryUnits,
    availableUnits,
    availablePercent,
    totalEquipmentCount,
    activeBorrowUnits,
    distinctBorrowersCount,
  } = data1.stats;

  if (
    typeof totalInventoryUnits !== "number" ||
    typeof availableUnits !== "number" ||
    typeof availablePercent !== "number" ||
    typeof totalEquipmentCount !== "number" ||
    typeof activeBorrowUnits !== "number" ||
    typeof distinctBorrowersCount !== "number"
  ) {
    throw new Error("Test 1 Failed: Stats fields must all be valid numbers");
  }

  console.log("  -> [PASS] GET /api/dashboard returned correct schema and 200 OK");

  // ------------------------------------------------------------------
  // 2. Cross-screen Reconciliation: Dashboard vs Equipment Inventory
  // ------------------------------------------------------------------
  console.log("\n[Test 2] Cross-Screen Metric Reconciliation: Dashboard vs GET /api/equipment...");
  const eqRes = await fetch(`${BASE_URL}/api/equipment?limit=100`, { headers });
  const eqData = await eqRes.json();

  if (!eqRes.ok || !eqData.items) {
    throw new Error("Test 2 Failed: Unable to fetch equipment list for reconciliation");
  }

  console.log("Inventory Stats from /api/equipment:", eqData.stats);

  if (eqData.stats.totalInventoryUnits !== totalInventoryUnits) {
    throw new Error(
      `Test 2 Reconciliation Mismatch: Equipment Total (${eqData.stats.totalInventoryUnits}) != Dashboard Total (${totalInventoryUnits})`
    );
  }

  if (eqData.stats.availableStock !== availableUnits) {
    throw new Error(
      `Test 2 Reconciliation Mismatch: Equipment Available (${eqData.stats.availableStock}) != Dashboard Available (${availableUnits})`
    );
  }

  if (eqData.stats.currentlyBorrowed !== activeBorrowUnits) {
    throw new Error(
      `Test 2 Reconciliation Mismatch: Equipment Borrowed (${eqData.stats.currentlyBorrowed}) != Dashboard Active Borrow Units (${activeBorrowUnits})`
    );
  }

  console.log("  -> [PASS] Dashboard Total Units, Available Units, and Active Borrow Units EXACTLY reconcile with Inventory!");

  // ------------------------------------------------------------------
  // 3. Mathematical Invariant Check: Total == Available + Borrowed
  // ------------------------------------------------------------------
  console.log("\n[Test 3] Verifying Conservation Invariant: totalInventoryUnits == availableUnits + activeBorrowUnits...");
  console.log(`Calculation: ${availableUnits} available + ${activeBorrowUnits} borrowed = ${availableUnits + activeBorrowUnits} (Total: ${totalInventoryUnits})`);

  if (availableUnits + activeBorrowUnits !== totalInventoryUnits) {
    throw new Error(
      `Test 3 Invariant Violated: ${availableUnits} + ${activeBorrowUnits} !== ${totalInventoryUnits}`
    );
  }
  console.log("  -> [PASS] Mathematical invariant strictly maintained!");

  // ------------------------------------------------------------------
  // 4. Latest Borrowed Verification: Max 5 items, sorted descending
  // ------------------------------------------------------------------
  console.log("\n[Test 4] Verifying 'Latest Borrowed' table data (Top 5, descending order, status)...");
  if (!Array.isArray(data1.latestBorrows)) {
    throw new Error("Test 4 Failed: latestBorrows must be an array");
  }

  if (data1.latestBorrows.length > 5) {
    throw new Error(`Test 4 Failed: latestBorrows has ${data1.latestBorrows.length} rows, must be <= 5`);
  }

  for (let i = 0; i < data1.latestBorrows.length; i++) {
    const borrow = data1.latestBorrows[i];
    console.log(`  Row [${i + 1}]: Loan ${borrow.loan_code} | Borrower: ${borrow.borrower?.full_name} | Items: ${borrow.total_items_count} | Status: ${borrow.status}`);

    if (!borrow.id || !borrow.loan_code || !borrow.issued_at || !borrow.status) {
      throw new Error(`Test 4 Failed: Missing required fields on borrow row ${i}`);
    }

    if (!["Active", "Due Today", "Overdue", "Returned"].includes(borrow.status)) {
      throw new Error(`Test 4 Failed: Invalid status '${borrow.status}' on row ${i}`);
    }

    if (i > 0) {
      const prevTime = new Date(data1.latestBorrows[i - 1].issued_at).getTime();
      const currTime = new Date(borrow.issued_at).getTime();
      if (prevTime < currTime) {
        throw new Error("Test 4 Failed: latestBorrows is not sorted in descending order of issued_at");
      }
    }
  }
  console.log("  -> [PASS] Latest Borrows is capped at 5 and properly sorted descending by issue timestamp");

  // ------------------------------------------------------------------
  // 5. View Items modal integration test for top borrow record
  // ------------------------------------------------------------------
  if (data1.latestBorrows.length > 0) {
    const topBorrow = data1.latestBorrows[0];
    console.log(`\n[Test 5] Testing 'View Items' API for borrow ID ${topBorrow.id} (${topBorrow.loan_code})...`);
    const itemsRes = await fetch(`${BASE_URL}/api/borrows/${topBorrow.id}/items`, { headers });
    const itemsData = await itemsRes.json();

    if (!itemsRes.ok || !itemsData.borrow || !Array.isArray(itemsData.borrow.items)) {
      throw new Error("Test 5 Failed: View Items endpoint failed or returned malformed data");
    }

    console.log(`  Items retrieved: ${itemsData.borrow.items.length} items`);
    for (const item of itemsData.borrow.items) {
      console.log(`    - ${item.name} (Qty: ${item.quantity})`);
    }
    console.log("  -> [PASS] View Items endpoint successfully feeds checklist modal from Dashboard");
  } else {
    console.log("\n[Test 5] Skipped (No borrows available to view items)");
  }

  // ------------------------------------------------------------------
  // 6. Security & Negative Test: Unauthorized Request
  // ------------------------------------------------------------------
  console.log("\n[Test 6] Security Test: GET /api/dashboard without session cookie...");
  const unauthRes = await fetch(`${BASE_URL}/api/dashboard`);
  console.log("Unauthenticated Status Code:", unauthRes.status);

  if (unauthRes.status !== 401) {
    throw new Error(`Test 6 Failed: Expected 401 Unauthorized, got ${unauthRes.status}`);
  }
  console.log("  -> [PASS] Protected route correctly refused unauthenticated request");

  // ------------------------------------------------------------------
  // 7. Deep link to Add Equipment verification
  // ------------------------------------------------------------------
  console.log("\n[Test 7] Verifying '+ Add Equipment' deep link (/inventory?action=add)...");
  const deepLinkRes = await fetch(`${BASE_URL}/inventory?action=add`, { headers });
  console.log("Inventory with action=add Status Code:", deepLinkRes.status);

  if (!deepLinkRes.ok) {
    throw new Error(`Test 7 Failed: Expected 200 OK on /inventory?action=add, got ${deepLinkRes.status}`);
  }
  console.log("  -> [PASS] Deep link /inventory?action=add responds cleanly with 200 OK");

  console.log("\n==========================================================");
  console.log("=== ALL PHASE 6 DASHBOARD TESTS PASSED SUCCESSFULLY! ===");
  console.log("==========================================================");
}

runPhase6Tests().catch((err) => {
  console.error("\n❌ PHASE 6 TEST FAILURE:", err);
  process.exit(1);
});

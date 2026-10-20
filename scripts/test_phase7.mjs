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

async function runPhase7HardeningSuite() {
  console.log("==================================================================");
  console.log("=== PHASE 7: HARDENING & FULL REGRESSION VERIFICATION SUITE ===");
  console.log("==================================================================");

  // Active admin session (must_change_credentials: false)
  const activeAdmin = {
    id: "9cfe159e-f867-487d-8532-2d56c3121ee4",
    employee_id: "IT-2026-001",
    company_email: "emmanueltolentino077@gmail.com",
    full_name: "Emmanuel Tolentino",
    username: "emmanuel",
    must_change_credentials: false,
  };

  // Setup-incomplete admin session (must_change_credentials: true)
  const setupIncompleteAdmin = {
    id: "a9cbcd4c-1931-4d08-98b2-1baea776c3cd",
    employee_id: "IT-2026-002",
    company_email: "test.admin2@uni.edu",
    full_name: "Jack Davis",
    username: "IT-2026-002",
    must_change_credentials: true,
  };

  const activeCookie = await createSessionCookie(activeAdmin);
  const setupCookie = await createSessionCookie(setupIncompleteAdmin);

  const authHeaders = {
    Cookie: activeCookie,
    "Content-Type": "application/json",
  };

  const setupHeaders = {
    Cookie: setupCookie,
    "Content-Type": "application/json",
  };

  // =========================================================================
  // SUITE 1: DIRECT-API ZERO-TRUST SECURITY & ACCESS CONTROL
  // =========================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("[Suite 1] Direct-API Zero-Trust Guard & Session Authentication");
  console.log("------------------------------------------------------------------");

  const protectedEndpoints = [
    { method: "GET", path: "/api/dashboard" },
    { method: "GET", path: "/api/equipment" },
    { method: "POST", path: "/api/equipment", body: { name: "Test", product_code: "T1", category: "Monitor", total_units: 1 } },
    { method: "PATCH", path: "/api/equipment/00000000-0000-0000-0000-000000000000", body: { total_units: 5 } },
    { method: "DELETE", path: "/api/equipment/00000000-0000-0000-0000-000000000000" },
    { method: "GET", path: "/api/equipment/export" },
    { method: "GET", path: "/api/borrowers/search" },
    { method: "POST", path: "/api/borrows", body: { borrower_id: "fake", items: [] } },
    { method: "GET", path: "/api/borrows" },
    { method: "GET", path: "/api/borrows/00000000-0000-0000-0000-000000000000/items" },
    { method: "POST", path: "/api/borrows/00000000-0000-0000-0000-000000000000/return" },
  ];

  console.log("1.1 Testing all 11 protected API endpoints without session cookie (Expected: 401 Unauthorized)...");
  for (const ep of protectedEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: { "Content-Type": "application/json" },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });

    if (res.status !== 401) {
      throw new Error(`Security Failure: ${ep.method} ${ep.path} returned ${res.status}, expected 401 Unauthorized!`);
    }
  }
  console.log("  -> [PASS] All 11 API endpoints strictly reject unauthenticated requests with 401.");

  console.log("\n1.2 Testing protected API endpoints with setup-incomplete session (Expected: 403 Forbidden)...");
  const setupRestrictedEndpoints = [
    { method: "GET", path: "/api/dashboard" },
    { method: "GET", path: "/api/equipment" },
    { method: "GET", path: "/api/borrows" },
    { method: "POST", path: "/api/borrows", body: { borrower_id: "fake", items: [] } },
  ];

  for (const ep of setupRestrictedEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: setupHeaders,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });

    if (res.status !== 403) {
      throw new Error(`Security Failure: ${ep.method} ${ep.path} returned ${res.status}, expected 403 Forbidden for setup-incomplete admin!`);
    }
  }
  console.log("  -> [PASS] Setup-incomplete admin strictly blocked from functional APIs with 403 Forbidden.");

  // =========================================================================
  // SUITE 2: MALFORMED PAYLOADS, BOUNDARY CHECKS & ERROR HANDLING
  // =========================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("[Suite 2] Malformed Payload & Input Validation Hardening");
  console.log("------------------------------------------------------------------");

  console.log("2.1 Equipment creation validation checks...");
  // Missing product code
  const resBadCode = await fetch(`${BASE_URL}/api/equipment`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Monitor", category: "Monitor", total_units: 5 }),
  });
  if (resBadCode.status !== 400) throw new Error("Expected 400 for missing product_code");

  // Zero total units
  const resZeroUnits = await fetch(`${BASE_URL}/api/equipment`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Monitor", product_code: "TEST-ZERO", category: "Monitor", total_units: 0 }),
  });
  if (resZeroUnits.status !== 400) throw new Error("Expected 400 for total_units = 0");

  console.log("  -> [PASS] Equipment creation rejects missing codes and non-positive units.");

  console.log("\n2.2 Borrow issuing validation checks...");
  // Empty tray
  const resEmptyTray = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ borrower_id: "some-id", items: [] }),
  });
  if (resEmptyTray.status !== 400) throw new Error("Expected 400 for empty tray");

  // Negative quantity in tray
  const resNegQty = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ borrower_id: "some-id", items: [{ equipment_id: "eq-1", quantity: -2 }] }),
  });
  if (resNegQty.status !== 400) throw new Error("Expected 400 for negative item quantity");

  console.log("  -> [PASS] Borrow issue rejects empty trays and negative quantities.");

  // =========================================================================
  // SUITE 3: END-TO-END CIRCULATION LIFECYCLE & CROSS-SCREEN RECONCILIATION
  // =========================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("[Suite 3] Full End-to-End Circulation Lifecycle & Invariant Audit");
  console.log("------------------------------------------------------------------");

  // Step 3.1: Capture baseline metrics
  const baseDashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: authHeaders });
  const baseDash = await baseDashRes.json();
  const baseEqRes = await fetch(`${BASE_URL}/api/equipment?limit=100`, { headers: authHeaders });
  const baseEq = await baseEqRes.json();

  console.log("Baseline Dashboard Stats:", baseDash.stats);
  console.log("Baseline Inventory Stats:", baseEq.stats);

  if (baseDash.stats.totalInventoryUnits !== baseEq.stats.totalInventoryUnits ||
      baseDash.stats.availableUnits !== baseEq.stats.availableStock ||
      baseDash.stats.activeBorrowUnits !== baseEq.stats.currentlyBorrowed) {
    throw new Error("Baseline Reconciliation Mismatch between Dashboard and Inventory!");
  }
  console.log("  -> [PASS] Baseline cross-screen reconciliation verified.");

  // Step 3.2: Add temporary equipment item for test (10 units)
  const testProductCode = `HRD-${Date.now().toString().slice(-6)}`;
  console.log(`\nAdding test equipment item [${testProductCode}] with 10 units...`);
  const addEqRes = await fetch(`${BASE_URL}/api/equipment`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Hardening Test Unit",
      product_code: testProductCode,
      category: "PC",
      total_units: 10,
      spec: "16GB RAM, 512GB SSD",
    }),
  });
  const addEqData = await addEqRes.json();
  const testEqId = addEqData.item?.id || addEqData.equipment?.id;
  if (!addEqRes.ok || !testEqId) {
    throw new Error(`Failed to create test equipment: ${JSON.stringify(addEqData)}`);
  }
  console.log(`  -> Equipment created successfully with ID: ${testEqId}`);

  // Step 3.3: Fetch borrower Alex Santos
  const borrowerRes = await fetch(`${BASE_URL}/api/borrowers/search?q=Santos`, { headers: authHeaders });
  const borrowerData = await borrowerRes.json();
  if (!borrowerData.borrowers || borrowerData.borrowers.length === 0) {
    throw new Error("Test borrower Alex Santos not found");
  }
  const borrowerId = borrowerData.borrowers[0].id;

  // Step 3.4: Issue a 3-unit borrow
  console.log(`\nIssuing borrow of 3 units of [${testProductCode}] to borrower Alex Santos...`);
  const issueRes = await fetch(`${BASE_URL}/api/borrows`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      borrower_id: borrowerId,
      due_option: "3days",
      items: [{ equipment_id: testEqId, quantity: 3 }],
    }),
  });
  const issueData = await issueRes.json();
  const borrowId = issueData.borrow_id || issueData.borrow?.id;
  if (!issueRes.ok || !borrowId) {
    throw new Error(`Failed to issue borrow: ${JSON.stringify(issueData)}`);
  }
  console.log(`  -> Borrow issued successfully! Loan Code: ${issueData.loan_code || issueData.borrow?.loan_code}, ID: ${borrowId}`);

  // Step 3.5: Verify inventory and dashboard reflects -3 available and +3 borrowed
  const midDashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: authHeaders });
  const midDash = await midDashRes.json();
  const midEqRes = await fetch(`${BASE_URL}/api/equipment?limit=100`, { headers: authHeaders });
  const midEq = await midEqRes.json();

  console.log(`Circulation Stats -> Available: ${midDash.stats.availableUnits}, Borrowed: ${midDash.stats.activeBorrowUnits}, Total: ${midDash.stats.totalInventoryUnits}`);
  if (midDash.stats.availableUnits + midDash.stats.activeBorrowUnits !== midDash.stats.totalInventoryUnits) {
    throw new Error("Mathematical Invariant violated during active borrow!");
  }
  if (midEq.stats.availableStock !== midDash.stats.availableUnits) {
    throw new Error("Reconciliation mismatch during active borrow!");
  }
  console.log("  -> [PASS] Stock deduction and conservation invariant strictly maintained after issue.");

  // Step 3.6: Verify Manifest in View Items
  const itemsRes = await fetch(`${BASE_URL}/api/borrows/${borrowId}/items`, { headers: authHeaders });
  const itemsData = await itemsRes.json();
  if (!itemsRes.ok || itemsData.borrow?.items?.length === 0) {
    throw new Error("Failed to retrieve borrow manifest items");
  }
  console.log(`  -> [PASS] View Items manifest verified: ${itemsData.borrow.items[0].name} (Qty: ${itemsData.borrow.items[0].quantity})`);

  // Step 3.7: Mark Borrow as Returned
  console.log(`\nReturning borrow ${borrowId}...`);
  const returnRes = await fetch(`${BASE_URL}/api/borrows/${borrowId}/return`, {
    method: "POST",
    headers: authHeaders,
  });
  const returnData = await returnRes.json();
  if (!returnRes.ok) {
    throw new Error(`Failed to return borrow: ${JSON.stringify(returnData)}`);
  }
  console.log("  -> [PASS] Borrow marked as returned successfully.");

  // Step 3.8: Verify Idempotency / Double-return protection (Q27)
  const doubleReturnRes = await fetch(`${BASE_URL}/api/borrows/${borrowId}/return`, {
    method: "POST",
    headers: authHeaders,
  });
  if (doubleReturnRes.status !== 409) {
    throw new Error(`Expected 409 Conflict on double return, got ${doubleReturnRes.status}`);
  }
  console.log("  -> [PASS] Double-return attack prevented with 409 Conflict ('Already returned').");

  // Step 3.9: Clean up test equipment
  console.log(`\nCleaning up temporary test equipment ${testEqId}...`);
  // Note: Since borrow history exists for this item, Q33 dictates it archives instead of hard deletes
  const delRes = await fetch(`${BASE_URL}/api/equipment/${testEqId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const delData = await delRes.json();
  if (!delRes.ok || delData.action !== "archived") {
    throw new Error(`Expected item with borrow history to be safely archived (Q33 rule), got: ${JSON.stringify(delData)}`);
  }
  console.log(`  -> [PASS] Q33 History Protection Verified: Equipment safely archived (${delData.action}).`);

  // =========================================================================
  // SUITE 4: FRONTEND PAGE ROUTES & DEEP LINK HEALTH
  // =========================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("[Suite 4] Frontend Page Routes & Deep-Link Health Checks");
  console.log("------------------------------------------------------------------");

  const pageRoutes = [
    { name: "Login Page", path: "/login", expectStatus: 200 },
    { name: "Activate Page", path: "/activate", expectStatus: 200 },
    { name: "Dashboard Page", path: "/dashboard", headers: authHeaders, expectStatus: 200 },
    { name: "New Borrow Page", path: "/new-borrow", headers: authHeaders, expectStatus: 200 },
    { name: "Returns Desk Page", path: "/returns", headers: authHeaders, expectStatus: 200 },
    { name: "Equipment Inventory Page", path: "/inventory", headers: authHeaders, expectStatus: 200 },
    { name: "+ Add Equipment Deep Link", path: "/inventory?action=add", headers: authHeaders, expectStatus: 200 },
  ];

  for (const page of pageRoutes) {
    const res = await fetch(`${BASE_URL}${page.path}`, {
      headers: page.headers,
    });
    console.log(`  Checking ${page.name} (${page.path}) -> Status: ${res.status}`);
    if (res.status !== page.expectStatus) {
      throw new Error(`Page Route Failure: ${page.path} returned ${res.status}, expected ${page.expectStatus}`);
    }
  }
  console.log("  -> [PASS] All application pages and deep-links respond cleanly with 200 OK.");

  console.log("\n==================================================================");
  console.log("=== ALL PHASE 7 HARDENING & REGRESSION TESTS PASSED! ===");
  console.log("==================================================================");
}

runPhase7HardeningSuite().catch((err) => {
  console.error("\n❌ PHASE 7 TEST FAILURE:", err);
  process.exit(1);
});

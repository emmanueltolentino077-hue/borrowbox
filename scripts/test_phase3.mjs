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

async function runTests() {
  console.log("=== PHASE 3 AUTOMATED VERIFICATION ===");

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

  // 1. GET /api/equipment
  console.log("\n[Test 1] Testing GET /api/equipment (Default)...");
  const res1 = await fetch(`${BASE_URL}/api/equipment`, { headers });
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Items returned:", data1.items?.length);
  console.log("Stats:", data1.stats);
  console.log("Pagination:", data1.pagination);
  if (!res1.ok || !data1.items || data1.items.length === 0) {
    throw new Error("Test 1 Failed: Expected items and 200 OK");
  }

  // 2. GET /api/equipment with Category Filter
  console.log("\n[Test 2] Testing Category Filter (Monitor)...");
  const res2 = await fetch(`${BASE_URL}/api/equipment?category=Monitor`, { headers });
  const data2 = await res2.json();
  console.log("Monitors count:", data2.items?.length);
  const allMonitors = data2.items.every((i) => i.category.toLowerCase() === "monitor");
  console.log("All items category 'Monitor'?", allMonitors);
  if (!allMonitors) throw new Error("Test 2 Failed: Category filter not matching");

  // 3. GET /api/equipment with Search
  console.log("\n[Test 3] Testing Search (Dell)...");
  const res3 = await fetch(`${BASE_URL}/api/equipment?search=dell`, { headers });
  const data3 = await res3.json();
  console.log("Dell search results:", data3.items?.length);
  if (data3.items.length === 0) throw new Error("Test 3 Failed: Search returned 0");

  // 4. POST /api/equipment (Create new equipment)
  console.log("\n[Test 4] Testing POST /api/equipment (Create item)...");
  const testCode = `TEST-${Date.now().toString().slice(-4)}`;
  const newEquipment = {
    name: "Automated Test Laptop Pro",
    product_code: testCode,
    category: "PC",
    total_units: 5,
    spec: "Intel Core i7, 16GB RAM, 512GB SSD",
  };

  const res4 = await fetch(`${BASE_URL}/api/equipment`, {
    method: "POST",
    headers,
    body: JSON.stringify(newEquipment),
  });
  const data4 = await res4.json();
  console.log("Create Status:", res4.status, data4.item?.id, data4.message);
  if (!res4.ok || !data4.item?.id) {
    throw new Error("Test 4 Failed: Could not create equipment");
  }
  const createdId = data4.item.id;

  // 5. POST duplicate product_code (Q30: Case-insensitive uniqueness)
  console.log("\n[Test 5] Testing Q30: Duplicate product_code rejection...");
  const res5 = await fetch(`${BASE_URL}/api/equipment`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Duplicate Item",
      product_code: testCode.toLowerCase(), // lowercase test
      category: "PC",
      total_units: 2,
    }),
  });
  const data5 = await res5.json();
  console.log("Duplicate status:", res5.status, data5.message);
  if (res5.status !== 400) {
    throw new Error("Test 5 Failed: Duplicate product code should return 400");
  }

  // 6. PATCH /api/equipment/[id] (Update details & Q32 validation)
  console.log("\n[Test 6] Testing PATCH /api/equipment/[id] (Update quantity)...");
  const res6 = await fetch(`${BASE_URL}/api/equipment/${createdId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: "Automated Test Laptop Pro (Updated)",
      total_units: 8,
      spec: "Updated Specs",
    }),
  });
  const data6 = await res6.json();
  console.log("Update status:", res6.status, data6.item?.total_units, data6.item?.available_units);
  if (!res6.ok || data6.item?.total_units !== 8 || data6.item?.available_units !== 8) {
    throw new Error("Test 6 Failed: Total units update mismatch");
  }

  // 7. Test total_units < 1 rejection
  console.log("\n[Test 7] Testing invalid total_units (< 1)...");
  const res7 = await fetch(`${BASE_URL}/api/equipment/${createdId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      total_units: 0,
    }),
  });
  const data7 = await res7.json();
  console.log("Zero total_units status:", res7.status, data7.message);
  if (res7.status !== 400) {
    throw new Error("Test 7 Failed: Expected 400 for total_units < 1");
  }

  // 8. Q32 Rule on item with active borrows (MOU-001 has 2 units borrowed)
  console.log("\n[Test 8] Testing Q32 rule: cannot lower total below borrowed (MOU-001)...");
  const res8 = await fetch(`${BASE_URL}/api/equipment/44f7253a-453b-4106-8839-38956932f49b`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      total_units: 1, // MOU-001 has 2 units borrowed out of 30!
    }),
  });
  const data8 = await res8.json();
  console.log("Lower than borrowed status:", res8.status, data8.message);
  if (res8.status !== 400) {
    throw new Error("Test 8 Failed: Expected 400 when new_total < currently_borrowed");
  }

  // 9. Q33 Rule on item with active borrows: cannot delete/archive while borrowed
  console.log("\n[Test 9] Testing Q33 rule: cannot delete item while units are borrowed...");
  const res9 = await fetch(`${BASE_URL}/api/equipment/44f7253a-453b-4106-8839-38956932f49b`, {
    method: "DELETE",
    headers,
  });
  const data9 = await res9.json();
  console.log("Delete borrowed item status:", res9.status, data9.message);
  if (res9.status !== 400) {
    throw new Error("Test 9 Failed: Expected 400 when attempting to delete item with active loans");
  }

  // 10. Q33 Rule on item with 0 history: permanent hard delete
  console.log("\n[Test 10] Testing Q33: Permanent hard delete for item with 0 history...");
  const res10 = await fetch(`${BASE_URL}/api/equipment/${createdId}`, {
    method: "DELETE",
    headers,
  });
  const data10 = await res10.json();
  console.log("Delete zero history status:", res10.status, data10.action, data10.message);
  if (!res10.ok || data10.action !== "deleted") {
    throw new Error("Test 10 Failed: Expected action 'deleted'");
  }

  // 11. GET /api/equipment/export (CSV export)
  console.log("\n[Test 11] Testing CSV Export...");
  const res11 = await fetch(`${BASE_URL}/api/equipment/export`, { headers });
  const csvText = await res11.text();
  console.log("CSV Status:", res11.status);
  console.log("CSV Content-Type:", res11.headers.get("content-type"));
  console.log("CSV Header Row:", csvText.split("\r\n")[0]);
  console.log("Total CSV lines:", csvText.split("\r\n").length);
  if (!res11.ok || !csvText.includes("Product Code")) {
    throw new Error("Test 11 Failed: Invalid CSV output");
  }

  console.log("\n=======================================================");
  console.log(">>> ALL 11 PHASE 3 VERIFICATION TESTS PASSED! <<<");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

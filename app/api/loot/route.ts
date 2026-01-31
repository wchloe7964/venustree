import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data/loot.json");

export async function GET(request: NextRequest) {
  try {
    // 1. Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }

    // 2. Read the master data
    const fileContent = fs.readFileSync(filePath, "utf8");
    const allLoot = JSON.parse(fileContent || "[]");

    // 3. Extract tenant from URL query parameters
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get("tenant");

    // 4. Logic: Filter if tenant is specified, otherwise return everything (Global View)
    if (tenant && tenant !== "undefined" && tenant !== "null") {
      const filteredData = allLoot.filter(
        (item: any) => item.tenant === tenant,
      );
      return NextResponse.json(filteredData, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Return global data for Super Admin
    return NextResponse.json(allLoot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get("tenant");

    // Safety: If no tenant is specified, we don't want to accidentally wipe the whole DB
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant ID required for purge" },
        { status: 400 },
      );
    }

    if (!fs.existsSync(filePath)) return NextResponse.json({ success: true });

    const allLoot = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");

    // Filter OUT the loot belonging to this specific tenant
    const updatedLoot = allLoot.filter((item: any) => item.tenant !== tenant);

    fs.writeFileSync(filePath, JSON.stringify(updatedLoot, null, 2));

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}

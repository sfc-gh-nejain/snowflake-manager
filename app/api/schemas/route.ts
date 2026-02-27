import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database");
    if (!database || !VALID_ID.test(database)) {
      return NextResponse.json({ error: "Invalid database name" }, { status: 400 });
    }

    const rows = await query<Record<string, string>>(
      `SHOW SCHEMAS IN DATABASE "${database}"`
    );
    const schemas = rows.map((r) => ({
      name: r.name,
      created_on: r.created_on,
      owner: r.owner,
    }));
    return NextResponse.json(schemas);
  } catch (error) {
    console.error("Error fetching schemas:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database");
    const schema = request.nextUrl.searchParams.get("schema");
    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const rows = await query<Record<string, string>>(
      `SHOW STAGES IN "${database}"."${schema}"`
    );
    const stages = rows.map((r) => ({
      name: r.name,
      database_name: r.database_name,
      schema_name: r.schema_name,
      url: r.url,
      type: r.type,
      owner: r.owner,
      created_on: r.created_on,
    }));
    return NextResponse.json(stages);
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database");
    const schema = request.nextUrl.searchParams.get("schema");
    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const rows = await query<Record<string, string>>(
      `SHOW VIEWS IN "${database}"."${schema}"`
    );
    const views = rows.map((r) => ({
      name: r.name,
      database_name: r.database_name,
      schema_name: r.schema_name,
      created_on: r.created_on,
      owner: r.owner,
      text: r.text,
    }));
    return NextResponse.json(views);
  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, definition } = body;

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema) || !name || !VALID_ID.test(name)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }
    if (!definition || typeof definition !== "string") {
      return NextResponse.json({ error: "View definition is required" }, { status: 400 });
    }

    const sql = `CREATE VIEW "${database}"."${schema}"."${name}" AS\n${definition}`;
    const result = await execute(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating view:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

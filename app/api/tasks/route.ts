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
      `SHOW TASKS IN "${database}"."${schema}"`
    );
    const tasks = rows.map((r) => ({
      name: r.name,
      database_name: r.database_name,
      schema_name: r.schema_name,
      schedule: r.schedule,
      state: r.state,
      definition: r.definition,
      created_on: r.created_on,
      owner: r.owner,
      warehouse: r.warehouse,
    }));
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, warehouse, schedule, definition, comment } = body;

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema) || !name || !VALID_ID.test(name)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }
    if (warehouse && !VALID_ID.test(warehouse)) {
      return NextResponse.json({ error: "Invalid warehouse name" }, { status: 400 });
    }
    if (!schedule || !definition) {
      return NextResponse.json({ error: "Schedule and definition are required" }, { status: 400 });
    }

    let sql = `CREATE TASK "${database}"."${schema}"."${name}"`;
    if (warehouse) sql += `\n  WAREHOUSE = "${warehouse}"`;
    sql += `\n  SCHEDULE = '${schedule.replace(/'/g, "''")}'`;
    if (comment) sql += `\n  COMMENT = '${comment.replace(/'/g, "''")}'`;
    sql += `\nAS\n${definition}`;

    const result = await execute(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const CONFIG_TABLE = "PIPELINE_CONFIGS";

async function ensureConfigTable(database: string, schema: string) {
  const fqn = `"${database}"."${schema}"."${CONFIG_TABLE}"`;
  await execute(`
    CREATE TABLE IF NOT EXISTS ${fqn} (
      ID NUMBER AUTOINCREMENT,
      NAME VARCHAR NOT NULL,
      CONFIG VARIANT NOT NULL,
      CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
  `);
}

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database");
    const schema = request.nextUrl.searchParams.get("schema");
    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    await ensureConfigTable(database, schema);
    const fqn = `"${database}"."${schema}"."${CONFIG_TABLE}"`;
    const rows = await query<Record<string, unknown>>(
      `SELECT ID, NAME, CONFIG, CREATED_AT FROM ${fqn} ORDER BY CREATED_AT DESC LIMIT 50`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching pipeline configs:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, config } = body;

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Pipeline name is required" }, { status: 400 });
    }

    await ensureConfigTable(database, schema);
    const fqn = `"${database}"."${schema}"."${CONFIG_TABLE}"`;
    const configJson = JSON.stringify(config);

    await execute(
      `INSERT INTO ${fqn} (NAME, CONFIG) SELECT ?, PARSE_JSON(?)`,
      [name.trim(), configJson]
    );

    return NextResponse.json({ message: "Pipeline configuration saved." });
  } catch (error) {
    console.error("Error saving pipeline config:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

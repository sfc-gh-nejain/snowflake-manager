import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const VALID_TYPES = [
  "VARCHAR", "STRING", "TEXT", "CHAR", "CHARACTER",
  "NUMBER", "NUMERIC", "DECIMAL", "INT", "INTEGER", "BIGINT", "SMALLINT", "TINYINT",
  "FLOAT", "DOUBLE", "REAL",
  "BOOLEAN",
  "DATE", "DATETIME", "TIME", "TIMESTAMP", "TIMESTAMP_LTZ", "TIMESTAMP_NTZ", "TIMESTAMP_TZ",
  "VARIANT", "OBJECT", "ARRAY",
  "BINARY", "VARBINARY",
  "GEOGRAPHY", "GEOMETRY",
];

function isValidType(t: string): boolean {
  const upper = t.toUpperCase().replace(/\(.*\)/, "").trim();
  return VALID_TYPES.includes(upper);
}

export async function GET(request: NextRequest) {
  try {
    const database = request.nextUrl.searchParams.get("database");
    const schema = request.nextUrl.searchParams.get("schema");
    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema)) {
      return NextResponse.json({ error: "Invalid database or schema name" }, { status: 400 });
    }

    const rows = await query<Record<string, string>>(
      `SHOW TABLES IN "${database}"."${schema}"`
    );
    const tables = rows.map((r) => ({
      name: r.name,
      database_name: r.database_name,
      schema_name: r.schema_name,
      kind: r.kind,
      rows: r.rows,
      bytes: r.bytes,
      created_on: r.created_on,
      owner: r.owner,
    }));
    return NextResponse.json(tables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, columns, comment } = body;

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema) || !name || !VALID_ID.test(name)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ error: "At least one column is required" }, { status: 400 });
    }

    for (const col of columns) {
      if (!col.name || !VALID_ID.test(col.name)) {
        return NextResponse.json({ error: `Invalid column name: ${col.name}` }, { status: 400 });
      }
      if (!col.type || !isValidType(col.type)) {
        return NextResponse.json({ error: `Invalid column type: ${col.type}` }, { status: 400 });
      }
    }

    const colDefs = columns
      .map((c: { name: string; type: string; nullable: boolean }) => {
        const nullable = c.nullable !== false ? "" : " NOT NULL";
        return `"${c.name}" ${c.type}${nullable}`;
      })
      .join(",\n  ");

    let sql = `CREATE TABLE "${database}"."${schema}"."${name}" (\n  ${colDefs}\n)`;
    if (comment) {
      const safeComment = comment.replace(/'/g, "''");
      sql += ` COMMENT = '${safeComment}'`;
    }

    const result = await execute(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

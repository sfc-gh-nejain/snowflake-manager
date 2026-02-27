import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/snowflake";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: tableName } = await params;
    const body = await request.json();
    const { database, schema, action, column } = body;

    if (
      !database || !VALID_ID.test(database) ||
      !schema || !VALID_ID.test(schema) ||
      !tableName || !VALID_ID.test(tableName)
    ) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const fqn = `"${database}"."${schema}"."${tableName}"`;

    if (action === "add_column") {
      if (!column?.name || !VALID_ID.test(column.name) || !column?.type || !isValidType(column.type)) {
        return NextResponse.json({ error: "Invalid column name or type" }, { status: 400 });
      }
      const nullable = column.nullable !== false ? "" : " NOT NULL";
      const sql = `ALTER TABLE ${fqn} ADD COLUMN "${column.name}" ${column.type}${nullable}`;
      const result = await execute(sql);
      return NextResponse.json(result);
    }

    if (action === "drop_column") {
      if (!column?.name || !VALID_ID.test(column.name)) {
        return NextResponse.json({ error: "Invalid column name" }, { status: 400 });
      }
      const sql = `ALTER TABLE ${fqn} DROP COLUMN "${column.name}"`;
      const result = await execute(sql);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action. Use 'add_column' or 'drop_column'." }, { status: 400 });
  } catch (error) {
    console.error("Error altering table:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

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
      `SHOW STREAMS IN "${database}"."${schema}"`
    );
    const streams = rows.map((r) => ({
      name: r.name,
      database_name: r.database_name,
      schema_name: r.schema_name,
      source_type: r.source_type,
      mode: r.mode,
      stale: r.stale,
      created_on: r.created_on,
      owner: r.owner,
      table_name: r.table_name,
    }));
    return NextResponse.json(streams);
  } catch (error) {
    console.error("Error fetching streams:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, sourceKind, sourceDatabase, sourceSchema, sourceTable, sourceStage, type, comment } = body;

    if (
      !database || !VALID_ID.test(database) ||
      !schema || !VALID_ID.test(schema) ||
      !name || !VALID_ID.test(name)
    ) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const validTypes = ["STANDARD", "APPEND_ONLY", "INSERT_ONLY"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid stream type" }, { status: 400 });
    }

    let sql = `CREATE STREAM "${database}"."${schema}"."${name}"`;

    if (sourceKind === "stage") {
      if (!sourceStage || !VALID_ID.test(sourceStage)) {
        return NextResponse.json({ error: "Invalid stage identifier" }, { status: 400 });
      }
      sql += `\n  ON STAGE "${database}"."${schema}"."${sourceStage}"`;
    } else {
      if (
        !sourceDatabase || !VALID_ID.test(sourceDatabase) ||
        !sourceSchema || !VALID_ID.test(sourceSchema) ||
        !sourceTable || !VALID_ID.test(sourceTable)
      ) {
        return NextResponse.json({ error: "Invalid source table identifier" }, { status: 400 });
      }
      sql += `\n  ON TABLE "${sourceDatabase}"."${sourceSchema}"."${sourceTable}"`;
    }

    if (type === "APPEND_ONLY") sql += `\n  APPEND_ONLY = TRUE`;
    if (type === "INSERT_ONLY") sql += `\n  INSERT_ONLY = TRUE`;
    if (comment) sql += `\n  COMMENT = '${comment.replace(/'/g, "''")}'`;

    const result = await execute(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating stream:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

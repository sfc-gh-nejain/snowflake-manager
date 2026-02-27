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
      `SHOW PROCEDURES IN "${database}"."${schema}"`
    );
    const procedures = rows.map((r) => ({
      name: r.name,
      schema_name: r.schema_name,
      arguments: r.arguments,
      description: r.description,
      created_on: r.created_on,
    }));
    return NextResponse.json(procedures);
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, arguments: args, returns, language, body: procBody, comment } = body;

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema) || !name || !VALID_ID.test(name)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const validLanguages = ["SQL", "JAVASCRIPT", "PYTHON", "JAVA", "SCALA"];
    if (!language || !validLanguages.includes(language.toUpperCase())) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    if (!returns) {
      return NextResponse.json({ error: "Return type is required" }, { status: 400 });
    }
    if (!procBody) {
      return NextResponse.json({ error: "Procedure body is required" }, { status: 400 });
    }

    const argDefs = Array.isArray(args) && args.length > 0
      ? args
          .map((a: { name: string; type: string }) => {
            if (!a.name || !VALID_ID.test(a.name)) throw new Error(`Invalid argument name: ${a.name}`);
            return `"${a.name}" ${a.type}`;
          })
          .join(", ")
      : "";

    let sql = `CREATE PROCEDURE "${database}"."${schema}"."${name}"(${argDefs})`;
    sql += `\n  RETURNS ${returns}`;
    sql += `\n  LANGUAGE ${language.toUpperCase()}`;
    if (comment) sql += `\n  COMMENT = '${comment.replace(/'/g, "''")}'`;
    sql += `\n  AS $$\n${procBody}\n$$`;

    const result = await execute(sql);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating procedure:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

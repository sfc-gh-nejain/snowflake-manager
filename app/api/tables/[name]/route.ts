import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const database = request.nextUrl.searchParams.get("database");
    const schema = request.nextUrl.searchParams.get("schema");

    if (!database || !VALID_ID.test(database) || !schema || !VALID_ID.test(schema) || !name || !VALID_ID.test(name)) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const rows = await query<Record<string, string>>(
      `DESCRIBE TABLE "${database}"."${schema}"."${name}"`
    );
    const columns = rows.map((r) => ({
      name: r.name,
      type: r.type,
      nullable: r["null?"] || r.nullable || "Y",
      default: r.default || "",
      comment: r.comment || "",
    }));
    return NextResponse.json(columns);
  } catch (error) {
    console.error("Error describing table:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

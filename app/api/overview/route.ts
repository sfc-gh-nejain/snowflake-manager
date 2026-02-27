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

    const [tables, views, tasks, streams, procedures] = await Promise.all([
      query(`SHOW TABLES IN "${database}"."${schema}"`).then((r) => r.length).catch(() => 0),
      query(`SHOW VIEWS IN "${database}"."${schema}"`).then((r) => r.length).catch(() => 0),
      query(`SHOW TASKS IN "${database}"."${schema}"`).then((r) => r.length).catch(() => 0),
      query(`SHOW STREAMS IN "${database}"."${schema}"`).then((r) => r.length).catch(() => 0),
      query(`SHOW PROCEDURES IN "${database}"."${schema}"`).then((r) => r.length).catch(() => 0),
    ]);

    return NextResponse.json({ tables, views, tasks, streams, procedures });
  } catch (error) {
    console.error("Error fetching overview:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

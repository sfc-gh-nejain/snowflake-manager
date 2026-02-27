import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

export async function GET() {
  try {
    const rows = await query<Record<string, string>>("SHOW DATABASES");
    const databases = rows.map((r) => ({
      name: r.name,
      created_on: r.created_on,
      owner: r.owner,
    }));
    return NextResponse.json(databases);
  } catch (error) {
    console.error("Error fetching databases:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

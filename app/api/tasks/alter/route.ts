import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, schema, name, action, schedule, warehouse } = body;

    if (
      !database || !VALID_ID.test(database) ||
      !schema || !VALID_ID.test(schema) ||
      !name || !VALID_ID.test(name)
    ) {
      return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
    }

    const fqn = `"${database}"."${schema}"."${name}"`;

    if (action === "suspend") {
      const result = await execute(`ALTER TASK ${fqn} SUSPEND`);
      return NextResponse.json(result);
    }

    if (action === "resume") {
      const result = await execute(`ALTER TASK ${fqn} RESUME`);
      return NextResponse.json(result);
    }

    if (action === "update") {
      const statements: string[] = [];
      // Must suspend before modifying
      statements.push(`ALTER TASK ${fqn} SUSPEND`);
      if (schedule) {
        const safeSchedule = schedule.replace(/'/g, "''");
        statements.push(`ALTER TASK ${fqn} SET SCHEDULE = '${safeSchedule}'`);
      }
      if (warehouse && VALID_ID.test(warehouse)) {
        statements.push(`ALTER TASK ${fqn} SET WAREHOUSE = "${warehouse}"`);
      }

      for (const sql of statements) {
        await execute(sql);
      }
      return NextResponse.json({ message: "Task updated successfully." });
    }

    return NextResponse.json({ error: "Invalid action. Use 'suspend', 'resume', or 'update'." }, { status: 400 });
  } catch (error) {
    console.error("Error altering task:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

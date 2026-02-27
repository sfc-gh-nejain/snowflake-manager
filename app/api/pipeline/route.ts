import { NextResponse } from "next/server";
import { execute } from "@/lib/snowflake";

const VALID_ID = /^[A-Za-z_][A-Za-z0-9_$]*$/;

interface PipelineNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

interface PipelineEdge {
  source: string;
  target: string;
}

interface PipelineRequest {
  database: string;
  schema: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

function validateId(name: string): boolean {
  return VALID_ID.test(name);
}

function getNodeName(node: PipelineNode): string {
  return (node.config.name as string) || node.label.replace(/\s+/g, "_").toUpperCase();
}

function buildTopologicalOrder(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const order: PipelineNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) order.push(node);
    for (const next of adj.get(id) || []) {
      const deg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return order;
}

function findUpstream(nodeId: string, edges: PipelineEdge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

function findDownstream(nodeId: string, edges: PipelineEdge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

export async function POST(request: Request) {
  try {
    const body: PipelineRequest = await request.json();
    const { database, schema, nodes, edges } = body;

    if (!database || !schema || !validateId(database) || !validateId(schema)) {
      return NextResponse.json({ error: "Invalid database or schema" }, { status: 400 });
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ error: "Pipeline must have at least one component" }, { status: 400 });
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const ordered = buildTopologicalOrder(nodes, edges);
    const sqlStatements: string[] = [];
    const fqn = (name: string) => `"${database}"."${schema}"."${name}"`;

    // Track which nodes produce what for procedure generation
    const stageNodes: PipelineNode[] = [];
    const tableNodes: PipelineNode[] = [];
    const aiNodes: PipelineNode[] = [];
    const taskNodes: PipelineNode[] = [];
    const streamNodes: PipelineNode[] = [];

    for (const node of ordered) {
      const name = getNodeName(node);
      if (!validateId(name)) {
        return NextResponse.json(
          { error: `Invalid name "${name}" for ${node.type}` },
          { status: 400 }
        );
      }

      switch (node.type) {
        case "stage":
          stageNodes.push(node);
          break;
        case "table":
          tableNodes.push(node);
          break;
        case "task":
          taskNodes.push(node);
          break;
        case "stream":
          streamNodes.push(node);
          break;
        default:
          if (node.type.startsWith("ai_")) {
            aiNodes.push(node);
          }
      }
    }

    // 1. Create stages
    for (const node of stageNodes) {
      const name = getNodeName(node);
      const dirEnabled = node.config.directory_enabled !== false;
      sqlStatements.push(
        `CREATE STAGE IF NOT EXISTS ${fqn(name)} DIRECTORY = (ENABLE = ${dirEnabled ? "TRUE" : "FALSE"})`
      );
    }

    // 2. Create tables
    for (const node of tableNodes) {
      const name = getNodeName(node);
      const columns = (node.config.columns as { name: string; type: string }[]) || [
        { name: "FILE_NAME", type: "VARCHAR" },
        { name: "PROCESSED_DATA", type: "VARIANT" },
        { name: "PROCESSED_AT", type: "TIMESTAMP_NTZ" },
      ];
      const colDefs = columns
        .filter((c) => c.name && validateId(c.name))
        .map((c) => `"${c.name}" ${c.type}`)
        .join(", ");
      sqlStatements.push(`CREATE TABLE IF NOT EXISTS ${fqn(name)} (${colDefs})`);
    }

    // 3. Build stored procedure if there are AI nodes connected between stage and table
    if (stageNodes.length > 0 && aiNodes.length > 0) {
      const stageName = getNodeName(stageNodes[0]);
      const targetTable = tableNodes.length > 0 ? getNodeName(tableNodes[0]) : null;

      // Build the AI processing chain
      let selectExpr = "relative_path AS FILE_NAME";
      let currentInput = `TO_FILE('@${fqn(stageName)}', relative_path)`;
      const fromClause = `DIRECTORY(@${fqn(stageName)})`;

      for (const aiNode of aiNodes) {
        const aiFunc = buildAIFunctionCall(aiNode, currentInput);
        selectExpr += `,\n    ${aiFunc} AS PROCESSED_DATA`;
        // Chain: next AI function takes output of previous
        currentInput = `PROCESSED_DATA::VARCHAR`;
      }

      selectExpr += `,\n    CURRENT_TIMESTAMP() AS PROCESSED_AT`;

      const procName = `PROCESS_PIPELINE_${Date.now().toString(36).toUpperCase()}`;
      let procBody: string;

      if (targetTable) {
        procBody = `
CREATE OR REPLACE PROCEDURE ${fqn(procName)}()
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
BEGIN
  INSERT INTO ${fqn(targetTable)} (FILE_NAME, PROCESSED_DATA, PROCESSED_AT)
  SELECT
    ${selectExpr}
  FROM ${fromClause};
  RETURN 'Pipeline executed successfully. Rows inserted into ${targetTable}.';
END;
$$`.trim();
      } else {
        procBody = `
CREATE OR REPLACE PROCEDURE ${fqn(procName)}()
RETURNS TABLE (FILE_NAME VARCHAR, PROCESSED_DATA VARIANT, PROCESSED_AT TIMESTAMP_NTZ)
LANGUAGE SQL
AS
$$
BEGIN
  RETURN TABLE(
    SELECT
      ${selectExpr}
    FROM ${fromClause}
  );
END;
$$`.trim();
      }

      sqlStatements.push(procBody);

      // 4. Create task if configured
      for (const taskNode of taskNodes) {
        const schedule = (taskNode.config.schedule as string) || "60 MINUTE";
        const warehouse = (taskNode.config.warehouse as string) || "HLEVEL1";
        const taskName = getNodeName(taskNode);

        if (!validateId(taskName) || !validateId(warehouse)) continue;

        sqlStatements.push(
          `CREATE OR REPLACE TASK ${fqn(taskName)}\n  WAREHOUSE = "${warehouse}"\n  SCHEDULE = '${schedule.replace(/'/g, "''")}'\nAS\n  CALL ${fqn(procName)}()`
        );
      }

      // 5. Create streams if configured
      for (const streamNode of streamNodes) {
        const streamName = getNodeName(streamNode);
        const streamType = (streamNode.config.stream_type as string) || "STANDARD";
        const appendOnly = streamType === "APPEND_ONLY" ? " APPEND_ONLY = TRUE" : "";
        const insertOnly = streamType === "INSERT_ONLY" ? " INSERT_ONLY = TRUE" : "";
        const sourceKind = (streamNode.config.source_kind as string) || "table";

        if (sourceKind === "stage") {
          // Stream on stage
          const stageName = (streamNode.config.stream_source as string) || "";
          if (stageName && validateId(stageName)) {
            sqlStatements.push(
              `CREATE STREAM IF NOT EXISTS ${fqn(streamName)} ON STAGE ${fqn(stageName)}${insertOnly}`
            );
          }
        } else {
          // Stream on table (original behavior — find upstream table connection)
          const upstreamIds = findUpstream(streamNode.id, edges);
          const upstreamTable = upstreamIds
            .map((id) => nodeMap.get(id))
            .find((n) => n?.type === "table");

          if (upstreamTable) {
            const sourceTableName = getNodeName(upstreamTable);
            sqlStatements.push(
              `CREATE STREAM IF NOT EXISTS ${fqn(streamName)} ON TABLE ${fqn(sourceTableName)}${appendOnly}${insertOnly}`
            );
          }
        }
      }
    } else if (aiNodes.length === 0 && stageNodes.length === 0) {
      // Just create the individual objects without a procedure
      // Tables, streams, tasks already handled above
    }

    // Execute all SQL statements
    const executed: string[] = [];
    for (const sql of sqlStatements) {
      try {
        await execute(sql);
        executed.push(sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          {
            error: `Failed executing SQL: ${msg}`,
            sql: [...executed, `/* FAILED */ ${sql}`],
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Pipeline created successfully! ${executed.length} object(s) created.`,
      sql: executed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildAIFunctionCall(node: PipelineNode, input: string): string {
  switch (node.type) {
    case "ai_extract": {
      const prompts = ((node.config.prompts as string) || "What is the document ID?")
        .split("\n")
        .filter((p) => p.trim())
        .map((p) => `'${p.trim().replace(/'/g, "''")}'`);
      const responseFormat = `[${prompts.join(", ")}]`;
      return `AI_EXTRACT(file => ${input}, responseFormat => ${responseFormat})`;
    }
    case "ai_classify": {
      const categories = ((node.config.categories as string) || "invoice\ncontract\nreceipt")
        .split("\n")
        .filter((c) => c.trim())
        .map((c) => `'${c.trim().replace(/'/g, "''")}'`);
      return `AI_CLASSIFY(${input}::VARCHAR, [${categories.join(", ")}])`;
    }
    case "ai_parse_document": {
      const mode = (node.config.mode as string) || "LAYOUT";
      return `AI_PARSE_DOCUMENT(${input}, {'mode': '${mode}'})`;
    }
    case "ai_summarize": {
      return `AI_SUMMARIZE(${input}::VARCHAR)`;
    }
    case "ai_sentiment": {
      return `AI_SENTIMENT(${input}::VARCHAR)`;
    }
    default:
      return input;
  }
}

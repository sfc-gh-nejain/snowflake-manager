import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

const SYSTEM_PROMPT = `You are a Snowflake pipeline architect. The user describes a data pipeline in natural language. You must return ONLY a valid JSON object (no markdown, no code fences) describing the pipeline components.

Available node types:
- "stage": An internal Snowflake stage for file ingestion. Config: { "name": "STAGE_NAME", "directory_enabled": true }
- "table": A Snowflake table. Config: { "name": "TABLE_NAME", "columns": [{"name":"COL","type":"VARCHAR"},...] }
- "task": A scheduled task. Config: { "name": "TASK_NAME", "schedule": "60 MINUTE", "warehouse": "HLEVEL1" }
- "stream": A change-tracking stream. Config: { "name": "STREAM_NAME", "stream_type": "STANDARD" }
- "ai_extract": AI_EXTRACT — extracts structured data from documents using prompts. Config: { "name": "EXTRACT_STEP", "prompts": "What is the invoice number?\\nWhat is the total amount?" }
- "ai_classify": AI_CLASSIFY — classifies text into categories. Config: { "name": "CLASSIFY_STEP", "categories": "invoice\\ncontract\\nreceipt" }
- "ai_parse_document": AI_PARSE_DOCUMENT — parses document layout/OCR. Config: { "name": "PARSE_STEP", "mode": "LAYOUT" }
- "ai_summarize": AI_SUMMARIZE — summarizes text. Config: { "name": "SUMMARIZE_STEP" }
- "ai_sentiment": AI_SENTIMENT — analyzes sentiment. Config: { "name": "SENTIMENT_STEP" }

Response JSON schema:
{
  "message": "A brief human-readable explanation of the pipeline you created",
  "nodes": [
    { "type": "<node_type>", "label": "<Display Label>", "config": { "name": "<OBJECT_NAME>", ...type-specific config... } }
  ],
  "edges": [
    { "source_index": 0, "target_index": 1 }
  ]
}

Rules:
- "edges" connects nodes by their index in the "nodes" array (0-based).
- Data flows left to right: source -> processing -> storage.
- Always use uppercase for Snowflake object names in config.
- A typical pipeline: Stage -> AI function(s) -> Table, optionally with a Task for scheduling and/or a Stream for change tracking.
- If the user asks a general question (not about building a pipeline), set "nodes" and "edges" to empty arrays and put your answer in "message".
- Return ONLY the JSON object. No extra text.`;

interface AICompleteResult {
  RESPONSE: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, database, schema } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const escapedSystem = SYSTEM_PROMPT.replace(/'/g, "''");
    const escapedUser = message.replace(/'/g, "''");

    const sql = `
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'claude-4-sonnet',
  [
    {'role': 'system', 'content': '${escapedSystem}'},
    {'role': 'user', 'content': 'Database: ${database || "MY_DB"}, Schema: ${schema || "PUBLIC"}. Request: ${escapedUser}'}
  ],
  {'temperature': 0.3, 'max_tokens': 4096}
) AS RESPONSE`;

    const rows = await query<AICompleteResult>(sql);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // The response is a JSON string like: { "choices": [{ "messages": "..." }], ... }
    const rawResponse = rows[0].RESPONSE;
    let aiResponseObj: { choices?: { messages: string }[] };

    try {
      aiResponseObj = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
    } catch {
      return NextResponse.json({
        message: rawResponse,
        nodes: [],
        edges: [],
      });
    }

    const content = aiResponseObj?.choices?.[0]?.messages || "";

    // Try to parse the content as our pipeline JSON
    let pipeline: { message: string; nodes: unknown[]; edges: unknown[] };
    try {
      // Strip potential markdown code fences
      const cleaned = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      pipeline = JSON.parse(cleaned);
    } catch {
      // If the AI returned plain text instead of JSON, wrap it
      pipeline = {
        message: content,
        nodes: [],
        edges: [],
      };
    }

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Pipeline chat error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

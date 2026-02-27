"use client";

import { useState, useEffect, useCallback } from "react";
import { type Node } from "@xyflow/react";
import { type PipelineNodeData, type PipelineNodeType } from "./custom-nodes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (id: string, config: Record<string, unknown>) => void;
  onClose: () => void;
  pipelineNodes?: Node[];
  database?: string;
  schema?: string;
}

export function NodeConfigPanel({ node, onUpdate, onClose, pipelineNodes, database, schema }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as unknown as PipelineNodeData;
  const config = data.config || {};

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...config, [key]: value });
  };

  return (
    <div className="w-[300px] min-w-[300px] border-l bg-background overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Configure: {data.label}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={(config.name as string) || ""}
            onChange={(e) => update("name", e.target.value)}
            placeholder={`my_${data.type}`}
            className="h-8 text-sm"
          />
        </div>

        <ConfigFields
          type={data.type}
          config={config}
          update={update}
          pipelineNodes={pipelineNodes}
          database={database}
          schema={schema}
          currentNodeId={node.id}
        />
      </div>
    </div>
  );
}

function ConfigFields({
  type,
  config,
  update,
  pipelineNodes,
  database,
  schema,
  currentNodeId,
}: {
  type: PipelineNodeType;
  config: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  pipelineNodes?: Node[];
  database?: string;
  schema?: string;
  currentNodeId?: string;
}) {
  switch (type) {
    case "stage":
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Directory Enabled</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={(config.directory_enabled as boolean) ?? true}
                onCheckedChange={(v) => update("directory_enabled", v)}
              />
              <span className="text-xs text-muted-foreground">Enable directory table</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File Format</Label>
            <Select
              value={(config.file_format as string) || ""}
              onValueChange={(v) => update("file_format", v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="JSON">JSON</SelectItem>
                <SelectItem value="PARQUET">Parquet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case "table":
      return <TableColumnConfig config={config} update={update} />;

    case "task":
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Schedule</Label>
            <Input
              value={(config.schedule as string) || ""}
              onChange={(e) => update("schedule", e.target.value)}
              placeholder="60 MINUTE"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warehouse</Label>
            <Input
              value={(config.warehouse as string) || ""}
              onChange={(e) => update("warehouse", e.target.value)}
              placeholder="HLEVEL1"
              className="h-8 text-sm"
            />
          </div>
        </>
      );

    case "stream":
      return (
        <StreamSourceConfig
          config={config}
          update={update}
          pipelineNodes={pipelineNodes}
          database={database}
          schema={schema}
          currentNodeId={currentNodeId}
        />
      );

    case "ai_extract":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Extraction Prompts</Label>
          <Textarea
            value={(config.prompts as string) || ""}
            onChange={(e) => update("prompts", e.target.value)}
            placeholder={`What is the document ID?\nWhat is the company name?\nWhat is the total amount?`}
            rows={5}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">One question per line</p>
        </div>
      );

    case "ai_classify":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Categories</Label>
          <Textarea
            value={(config.categories as string) || ""}
            onChange={(e) => update("categories", e.target.value)}
            placeholder={`invoice\ncontract\nreceipt\nreport`}
            rows={4}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">One category per line</p>
        </div>
      );

    case "ai_parse_document":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Parse Mode</Label>
          <Select
            value={(config.mode as string) || "LAYOUT"}
            onValueChange={(v) => update("mode", v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LAYOUT">Layout (preserves structure)</SelectItem>
              <SelectItem value="OCR">OCR (scanned documents)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "ai_summarize":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Summary Prompt (optional)</Label>
          <Textarea
            value={(config.prompt as string) || ""}
            onChange={(e) => update("prompt", e.target.value)}
            placeholder="Summarize the key findings..."
            rows={3}
            className="text-sm"
          />
        </div>
      );

    case "ai_sentiment":
      return (
        <p className="text-xs text-muted-foreground">
          Returns sentiment (positive, negative, neutral) for text content. No additional configuration needed.
        </p>
      );

    default:
      return null;
  }
}

function TableColumnConfig({
  config,
  update,
}: {
  config: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const columns = (config.columns as { name: string; type: string }[]) || [
    { name: "FILE_NAME", type: "VARCHAR" },
    { name: "PROCESSED_DATA", type: "VARIANT" },
    { name: "PROCESSED_AT", type: "TIMESTAMP_NTZ" },
  ];

  const setColumns = (cols: { name: string; type: string }[]) => update("columns", cols);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Columns</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setColumns([...columns, { name: "", type: "VARCHAR" }])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {columns.map((col, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <Input
            value={col.name}
            onChange={(e) => {
              const next = [...columns];
              next[i] = { ...col, name: e.target.value };
              setColumns(next);
            }}
            placeholder="column_name"
            className="h-7 text-xs flex-1"
          />
          <Select
            value={col.type}
            onValueChange={(v) => {
              const next = [...columns];
              next[i] = { ...col, type: v };
              setColumns(next);
            }}
          >
            <SelectTrigger className="h-7 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["VARCHAR", "VARIANT", "NUMBER", "BOOLEAN", "TIMESTAMP_NTZ", "DATE", "FLOAT"].map(
                (t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setColumns(columns.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

interface StageOption {
  name: string;
  source: "existing" | "draft";
}

function StreamSourceConfig({
  config,
  update,
  pipelineNodes,
  database,
  schema,
  currentNodeId,
}: {
  config: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  pipelineNodes?: Node[];
  database?: string;
  schema?: string;
  currentNodeId?: string;
}) {
  const [stages, setStages] = useState<StageOption[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  const fetchStages = useCallback(async () => {
    if (!database || !schema) return;
    setLoadingStages(true);
    try {
      const res = await fetch(
        `/api/stages?database=${encodeURIComponent(database)}&schema=${encodeURIComponent(schema)}`
      );
      if (res.ok) {
        const data = await res.json();
        const existing: StageOption[] = (data as { name: string }[]).map((s) => ({
          name: s.name,
          source: "existing" as const,
        }));
        setStages(existing);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingStages(false);
    }
  }, [database, schema]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // Collect draft stage nodes from the pipeline canvas (excluding current node)
  const draftStages: StageOption[] = (pipelineNodes || [])
    .filter((n) => {
      const nd = n.data as unknown as PipelineNodeData;
      return nd.type === "stage" && n.id !== currentNodeId;
    })
    .map((n) => {
      const nd = n.data as unknown as PipelineNodeData;
      const name = (nd.config?.name as string) || nd.label.replace(/\s+/g, "_").toUpperCase();
      return { name, source: "draft" as const };
    });

  // Merge: draft stages first, then existing (deduplicate by name)
  const draftNames = new Set(draftStages.map((s) => s.name));
  const allStages = [
    ...draftStages,
    ...stages.filter((s) => !draftNames.has(s.name)),
  ];

  const selectedSource = (config.stream_source as string) || "";
  const sourceKind = (config.source_kind as string) || "table";

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Stream Type</Label>
        <Select
          value={(config.stream_type as string) || "STANDARD"}
          onValueChange={(v) => update("stream_type", v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STANDARD">Standard</SelectItem>
            <SelectItem value="APPEND_ONLY">Append Only</SelectItem>
            <SelectItem value="INSERT_ONLY">Insert Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Source Type</Label>
        <Select
          value={sourceKind}
          onValueChange={(v) => {
            update("source_kind", v);
            update("stream_source", "");
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="table">Table (upstream connection)</SelectItem>
            <SelectItem value="stage">Stage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sourceKind === "stage" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Stage to Watch</Label>
          {loadingStages ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs text-muted-foreground">Loading stages...</span>
            </div>
          ) : allStages.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No stages found. Add a Stage node to the canvas or create one in your schema.
            </p>
          ) : (
            <Select value={selectedSource} onValueChange={(v) => update("stream_source", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {allStages.map((s) => (
                  <SelectItem key={`${s.source}-${s.name}`} value={s.name}>
                    {s.name}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      ({s.source === "draft" ? "pipeline draft" : "existing"})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[10px] text-muted-foreground">
            Creates a stream on the selected stage to track file changes.
          </p>
        </div>
      )}

      {sourceKind === "table" && (
        <p className="text-[10px] text-muted-foreground">
          The stream will watch the upstream table connected in the pipeline.
        </p>
      )}
    </>
  );
}

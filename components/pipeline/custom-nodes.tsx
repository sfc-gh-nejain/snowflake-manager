"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FolderArchive,
  Table2,
  Clock,
  Activity,
  Brain,
  FileSearch,
  Tags,
  FileText,
  Sparkles,
  ThumbsUp,
} from "lucide-react";

export type PipelineNodeType =
  | "stage"
  | "table"
  | "task"
  | "stream"
  | "ai_extract"
  | "ai_classify"
  | "ai_parse_document"
  | "ai_summarize"
  | "ai_sentiment";

export interface PipelineNodeData {
  label: string;
  type: PipelineNodeType;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

const NODE_STYLES: Record<
  PipelineNodeType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  stage: { icon: FolderArchive, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300" },
  table: { icon: Table2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-300" },
  task: { icon: Clock, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-300" },
  stream: { icon: Activity, color: "text-green-600", bg: "bg-green-50", border: "border-green-300" },
  ai_extract: { icon: FileSearch, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-300" },
  ai_classify: { icon: Tags, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-300" },
  ai_parse_document: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-300" },
  ai_summarize: { icon: Sparkles, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-300" },
  ai_sentiment: { icon: ThumbsUp, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-300" },
};

const CATEGORY_LABEL: Record<PipelineNodeType, string> = {
  stage: "Source",
  table: "Storage",
  task: "Orchestration",
  stream: "Orchestration",
  ai_extract: "AI Function",
  ai_classify: "AI Function",
  ai_parse_document: "AI Function",
  ai_summarize: "AI Function",
  ai_sentiment: "AI Function",
};

function PipelineNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as PipelineNodeData;
  const style = NODE_STYLES[nodeData.type] || NODE_STYLES.table;
  const Icon = style.icon;
  const category = CATEGORY_LABEL[nodeData.type];

  const isSource = nodeData.type === "stage";
  const isSink = nodeData.type === "table";

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-sm min-w-[180px] transition-all
        ${style.bg} ${style.border}
        ${selected ? "ring-2 ring-primary ring-offset-2 shadow-md" : ""}
      `}
    >
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${style.bg}`}>
          <Icon className={`h-4 w-4 ${style.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {category}
          </div>
          <div className="text-sm font-semibold truncate">{nodeData.label}</div>
        </div>
      </div>
      {!isSink && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-primary !border-2 !border-white"
        />
      )}
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);

export const nodeTypes = {
  pipeline: PipelineNode,
};

export { NODE_STYLES, CATEGORY_LABEL };

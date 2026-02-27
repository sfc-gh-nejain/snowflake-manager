"use client";

import { type PipelineNodeType, NODE_STYLES, CATEGORY_LABEL } from "./custom-nodes";

const PALETTE_ITEMS: { type: PipelineNodeType; label: string }[] = [
  { type: "stage", label: "Stage" },
  { type: "table", label: "Table" },
  { type: "task", label: "Task" },
  { type: "stream", label: "Stream" },
  { type: "ai_parse_document", label: "AI Parse Document" },
  { type: "ai_extract", label: "AI Extract" },
  { type: "ai_classify", label: "AI Classify" },
  { type: "ai_summarize", label: "AI Summarize" },
  { type: "ai_sentiment", label: "AI Sentiment" },
];

const GROUPS = [
  { label: "Sources", types: ["stage"] },
  { label: "AI Functions", types: ["ai_parse_document", "ai_extract", "ai_classify", "ai_summarize", "ai_sentiment"] },
  { label: "Storage", types: ["table"] },
  { label: "Orchestration", types: ["task", "stream"] },
];

export function PipelineSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: PipelineNodeType, label: string) => {
    event.dataTransfer.setData("application/pipeline-node-type", nodeType);
    event.dataTransfer.setData("application/pipeline-node-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-[220px] min-w-[220px] border-r bg-muted/30 p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Components
      </h3>
      {GROUPS.map((group) => (
        <div key={group.label} className="mb-4">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
            {group.label}
          </div>
          <div className="space-y-1">
            {PALETTE_ITEMS.filter((item) => group.types.includes(item.type)).map((item) => {
              const style = NODE_STYLES[item.type];
              const Icon = style.icon;
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type, item.label)}
                  className={`
                    flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-grab
                    transition-all hover:shadow-sm active:cursor-grabbing
                    ${style.bg} ${style.border}
                  `}
                >
                  <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-4 p-2 rounded-md bg-muted/50 border border-dashed">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Drag components onto the canvas and connect them to build your pipeline.
        </p>
      </div>
    </div>
  );
}

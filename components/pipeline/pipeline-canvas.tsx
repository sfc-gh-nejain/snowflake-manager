"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes, type PipelineNodeType, type PipelineNodeData } from "./custom-nodes";
import { PipelineSidebar } from "./pipeline-sidebar";
import { NodeConfigPanel } from "./node-config-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, Undo2, Bookmark, FolderOpen, Bot, SendHorizonal, User } from "lucide-react";

let idCounter = 0;
const getId = () => `node_${++idCounter}`;

interface PipelineCanvasProps {
  database: string;
  schema: string;
}

interface SavedConfig {
  ID: number;
  NAME: string;
  CONFIG: unknown;
  CREATED_AT: string;
}

function PipelineCanvasInner({ database, schema }: PipelineCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; sql?: string[] } | null>(null);
  const [configName, setConfigName] = useState("");
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [showLoadConfig, setShowLoadConfig] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/pipeline-node-type") as PipelineNodeType;
      const label = event.dataTransfer.getData("application/pipeline-node-label");

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type: "pipeline",
        position,
        data: {
          label: label || type,
          type,
          config: {},
        } satisfies PipelineNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleConfigUpdate = useCallback(
    (id: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === id
          ? { ...prev, data: { ...prev.data, config } }
          : prev
      );
    },
    [setNodes]
  );

  const handleSave = async () => {
    if (nodes.length === 0) {
      setResult({ success: false, message: "Add components to the canvas first." });
      return;
    }

    setSaving(true);
    setResult(null);

    const pipeline = {
      database,
      schema,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data as unknown as PipelineNodeData).type,
        label: (n.data as unknown as PipelineNodeData).label,
        config: (n.data as unknown as PipelineNodeData).config,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
      })),
    };

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pipeline),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message || "Pipeline created!", sql: data.sql });
      } else {
        setResult({ success: false, message: data.error || "Failed to create pipeline." });
      }
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setResult(null);
  };

  const handleSaveConfig = async () => {
    if (!configName.trim() || nodes.length === 0) return;
    setSavingConfig(true);
    try {
      const config = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.data as unknown as PipelineNodeData).type,
          label: (n.data as unknown as PipelineNodeData).label,
          config: (n.data as unknown as PipelineNodeData).config,
          position: n.position,
        })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      };
      const res = await fetch("/api/pipeline/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, name: configName.trim(), config }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message || "Config saved!" });
        setConfigName("");
        setShowSaveConfig(false);
      } else {
        setResult({ success: false, message: data.error || "Failed to save config." });
      }
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchConfigs = async () => {
    if (!database || !schema) return;
    setLoadingConfigs(true);
    try {
      const res = await fetch(`/api/pipeline/config?database=${encodeURIComponent(database)}&schema=${encodeURIComponent(schema)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSavedConfigs(data);
      }
    } catch { /* ignore */ }
    finally { setLoadingConfigs(false); }
  };

  const handleLoadConfig = (configStr: unknown) => {
    try {
      let parsed = configStr;
      // Handle string (possibly double-encoded from Snowflake VARIANT)
      while (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      const config = parsed as { nodes?: unknown[]; edges?: { source: string; target: string }[] };
      if (config.nodes && Array.isArray(config.nodes)) {
        const loadedNodes: Node[] = (config.nodes as { id: string; type: string; label: string; config: Record<string, unknown>; position: { x: number; y: number } }[]).map((n) => ({
          id: n.id,
          type: "pipeline",
          position: n.position || { x: Math.random() * 500, y: Math.random() * 400 },
          data: {
            label: n.label,
            type: n.type as PipelineNodeType,
            config: n.config || {},
          } satisfies PipelineNodeData,
        }));
        const loadedEdges: Edge[] = (config.edges || []).map((e: { source: string; target: string }, i: number) => ({
          id: `e_loaded_${i}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
        }));
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSelectedNode(null);
        setShowLoadConfig(false);
        setResult({ success: true, message: "Pipeline configuration loaded." });
      } else {
        setResult({ success: false, message: "Invalid configuration format — no nodes found." });
      }
    } catch {
      setResult({ success: false, message: "Failed to parse saved configuration." });
    }
  };

  const handleAddFromChat = useCallback(
    (
      newNodes: { type: PipelineNodeType; label: string; config: Record<string, unknown> }[],
      newEdges: { source_index: number; target_index: number }[]
    ) => {
      const existingCount = nodes.length;
      const startX = existingCount > 0 ? Math.max(...nodes.map((n) => n.position.x)) + 300 : 100;
      const startY = 80;

      const createdIds: string[] = [];
      const nodesToAdd: Node[] = newNodes.map((n, i) => {
        const id = getId();
        createdIds.push(id);
        return {
          id,
          type: "pipeline",
          position: { x: startX + i * 280, y: startY + (i % 2) * 80 },
          data: {
            label: n.label,
            type: n.type,
            config: n.config || {},
          } satisfies PipelineNodeData,
        };
      });

      const edgesToAdd: Edge[] = newEdges
        .filter(
          (e) =>
            e.source_index >= 0 &&
            e.source_index < createdIds.length &&
            e.target_index >= 0 &&
            e.target_index < createdIds.length
        )
        .map((e, i) => ({
          id: `e_chat_${Date.now()}_${i}`,
          source: createdIds[e.source_index],
          target: createdIds[e.target_index],
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
        }));

      setNodes((nds) => [...nds, ...nodesToAdd]);
      setEdges((eds) => [...eds, ...edgesToAdd]);
    },
    [nodes, setNodes, setEdges]
  );

  return (
    <div className="flex h-full">
      <PipelineSidebar />
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Pipeline Builder</h2>
            <span className="text-xs text-muted-foreground">
              {database}.{schema}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => { setShowLoadConfig(!showLoadConfig); if (!showLoadConfig) fetchConfigs(); }}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              Load
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowSaveConfig(!showSaveConfig)}
              disabled={nodes.length === 0}
            >
              <Bookmark className="h-3.5 w-3.5 mr-1.5" />
              Save Config
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="h-8">
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || nodes.length === 0} className="h-8">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Deploy Pipeline
            </Button>
          </div>
        </div>

        {/* Save config form */}
        {showSaveConfig && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <Input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Pipeline name..."
              className="h-8 text-sm max-w-[240px]"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveConfig(); }}
            />
            <Button size="sm" className="h-8" onClick={handleSaveConfig} disabled={savingConfig || !configName.trim()}>
              {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowSaveConfig(false)}>Cancel</Button>
          </div>
        )}

        {/* Load config dropdown */}
        {showLoadConfig && (
          <div className="px-4 py-2 border-b bg-muted/30 space-y-1.5">
            {loadingConfigs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading saved pipelines...
              </div>
            ) : savedConfigs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No saved pipelines found.</p>
            ) : (
              <Select onValueChange={(v) => { const cfg = savedConfigs.find((c) => String(c.ID) === v); if (cfg) handleLoadConfig(cfg.CONFIG); }}>
                <SelectTrigger className="h-8 text-sm max-w-[300px]">
                  <SelectValue placeholder="Select a saved pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {savedConfigs.map((cfg) => (
                    <SelectItem key={cfg.ID} value={String(cfg.ID)}>
                      {cfg.NAME} — {new Date(cfg.CREATED_AT).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Result banner */}
        {result && (
          <div
            className={`px-4 py-2 text-sm border-b ${
              result.success
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="font-medium">{result.message}</div>
            {result.sql && result.sql.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs cursor-pointer hover:underline">
                  View generated SQL ({result.sql.length} statements)
                </summary>
                <pre className="mt-1 text-xs bg-white/60 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                  {result.sql.join("\n\n")}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-muted/20"
          >
            <Controls position="bottom-left" />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Right panel: config or chatbot */}
      {selectedNode ? (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleConfigUpdate}
          onClose={() => setSelectedNode(null)}
          pipelineNodes={nodes}
          database={database}
          schema={schema}
        />
      ) : (
        <PipelineChatbot
          database={database}
          schema={schema}
          onAddNodes={handleAddFromChat}
        />
      )}
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  nodesAdded?: number;
}

interface PipelineChatbotProps {
  database: string;
  schema: string;
  onAddNodes: (
    nodes: { type: PipelineNodeType; label: string; config: Record<string, unknown> }[],
    edges: { source_index: number; target_index: number }[]
  ) => void;
}

const SUGGESTIONS = [
  "Build a pipeline to process PDF invoices",
  "Create a stage, parse documents, and store results",
  "Set up a sentiment analysis pipeline for reviews",
];

function PipelineChatbot({ database, schema, onAddNodes }: PipelineChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/pipeline/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, database, schema }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Something went wrong." },
        ]);
        return;
      }

      const nodes = data.nodes || [];
      const edges = data.edges || [];
      const aiMessage = data.message || "Done.";

      if (nodes.length > 0) {
        onAddNodes(nodes, edges);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiMessage,
          nodesAdded: nodes.length,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="w-[300px] min-w-[300px] border-l bg-background flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Assistant</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">claude-4-sonnet</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center space-y-3 mt-8">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pipeline Assistant</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Describe a pipeline in plain English and I&apos;ll create it on the canvas.
              </p>
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="block w-full text-left text-xs text-muted-foreground/70 px-3 py-1.5 bg-muted/50 rounded-md hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => { setInput(s); }}
                >
                  &quot;{s}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[230px] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
                {msg.nodesAdded != null && msg.nodesAdded > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/30 text-[10px] opacity-70">
                    Added {msg.nodesAdded} node{msg.nodesAdded !== 1 ? "s" : ""} to canvas
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2 items-center">
            <Bot className="h-4 w-4 text-primary" />
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a pipeline..."
            disabled={loading}
            rows={3}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={loading || !input.trim()}
            onClick={() => sendMessage(input)}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SendHorizonal className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

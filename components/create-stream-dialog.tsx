"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CreateStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  schema: string;
  onCreated: () => void;
}

export function CreateStreamDialog({
  open,
  onOpenChange,
  database,
  schema,
  onCreated,
}: CreateStreamDialogProps) {
  const [name, setName] = useState("");
  const [sourceKind, setSourceKind] = useState<"table" | "stage">("table");
  const [sourceDatabase, setSourceDatabase] = useState("");
  const [sourceSchema, setSourceSchema] = useState("");
  const [sourceTable, setSourceTable] = useState("");
  const [sourceStage, setSourceStage] = useState("");
  const [type, setType] = useState("STANDARD");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stages, setStages] = useState<{ name: string }[]>([]);
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
        if (Array.isArray(data)) setStages(data);
      }
    } catch { /* ignore */ }
    finally { setLoadingStages(false); }
  }, [database, schema]);

  useEffect(() => {
    if (open && sourceKind === "stage") {
      fetchStages();
    }
  }, [open, sourceKind, fetchStages]);

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Stream name is required"); return; }

    if (sourceKind === "table") {
      if (!sourceDatabase.trim() || !sourceSchema.trim() || !sourceTable.trim()) {
        setError("Source database, schema, and table are required");
        return;
      }
    } else {
      if (!sourceStage.trim()) {
        setError("Source stage is required");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database, schema, name,
          sourceKind,
          sourceDatabase, sourceSchema, sourceTable,
          sourceStage,
          type, comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create stream");
      setName("");
      setSourceKind("table");
      setSourceDatabase("");
      setSourceSchema("");
      setSourceTable("");
      setSourceStage("");
      setType("STANDARD");
      setComment("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Stream in {database}.{schema}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stream-name">Stream Name</Label>
              <Input
                id="stream-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MY_STREAM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stream-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="stream-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="APPEND_ONLY">Append Only</SelectItem>
                  <SelectItem value="INSERT_ONLY">Insert Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select value={sourceKind} onValueChange={(v) => setSourceKind(v as "table" | "stage")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceKind === "table" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="src-db">Source Database</Label>
                <Input
                  id="src-db"
                  value={sourceDatabase}
                  onChange={(e) => setSourceDatabase(e.target.value)}
                  placeholder={database}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="src-schema">Source Schema</Label>
                <Input
                  id="src-schema"
                  value={sourceSchema}
                  onChange={(e) => setSourceSchema(e.target.value)}
                  placeholder={schema}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="src-table">Source Table</Label>
                <Input
                  id="src-table"
                  value={sourceTable}
                  onChange={(e) => setSourceTable(e.target.value)}
                  placeholder="MY_TABLE"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Source Stage</Label>
              {loadingStages ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading stages...</span>
                </div>
              ) : stages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  No stages found in {database}.{schema}
                </p>
              ) : (
                <Select value={sourceStage} onValueChange={setSourceStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="stream-comment">Comment (optional)</Label>
            <Input
              id="stream-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Description..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

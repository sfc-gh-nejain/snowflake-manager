"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  schema: string;
  onCreated: () => void;
}

export function CreateViewDialog({
  open,
  onOpenChange,
  database,
  schema,
  onCreated,
}: CreateViewDialogProps) {
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("View name is required"); return; }
    if (!definition.trim()) { setError("SQL definition is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, name, definition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create view");
      setName("");
      setDefinition("");
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
          <DialogTitle>Create View in {database}.{schema}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MY_VIEW"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="view-def">SQL Definition (SELECT statement)</Label>
            <Textarea
              id="view-def"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="SELECT col1, col2 FROM my_table WHERE ..."
              className="font-mono min-h-[200px]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

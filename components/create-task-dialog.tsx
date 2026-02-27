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

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  schema: string;
  onCreated: () => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  database,
  schema,
  onCreated,
}: CreateTaskDialogProps) {
  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [schedule, setSchedule] = useState("");
  const [definition, setDefinition] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Task name is required"); return; }
    if (!schedule.trim()) { setError("Schedule is required"); return; }
    if (!definition.trim()) { setError("SQL definition is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, name, warehouse, schedule, definition, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      setName("");
      setWarehouse("");
      setSchedule("");
      setDefinition("");
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
          <DialogTitle>Create Task in {database}.{schema}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MY_TASK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-warehouse">Warehouse (optional)</Label>
              <Input
                id="task-warehouse"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                placeholder="COMPUTE_WH"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-schedule">Schedule</Label>
            <Input
              id="task-schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="USING CRON 0 9 * * * UTC  or  5 MINUTE"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-def">SQL Definition</Label>
            <Textarea
              id="task-def"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="INSERT INTO target_table SELECT * FROM source_table"
              className="font-mono min-h-[200px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-comment">Comment (optional)</Label>
            <Input
              id="task-comment"
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
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

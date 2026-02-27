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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  schema: string;
  onCreated: () => void;
}

const COLUMN_TYPES = [
  "VARCHAR",
  "NUMBER",
  "INTEGER",
  "FLOAT",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TIMESTAMP_LTZ",
  "TIMESTAMP_NTZ",
  "VARIANT",
  "ARRAY",
  "OBJECT",
];

export function CreateTableDialog({
  open,
  onOpenChange,
  database,
  schema,
  onCreated,
}: CreateTableDialogProps) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [columns, setColumns] = useState<Column[]>([
    { name: "", type: "VARCHAR", nullable: true },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addColumn = () => {
    setColumns([...columns, { name: "", type: "VARCHAR", nullable: true }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length === 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof Column, value: string | boolean) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Table name is required");
      return;
    }
    if (columns.some((c) => !c.name.trim())) {
      setError("All columns must have a name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, name, columns, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create table");
      setName("");
      setComment("");
      setColumns([{ name: "", type: "VARCHAR", nullable: true }]);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Table in {database}.{schema}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MY_TABLE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-comment">Comment (optional)</Label>
              <Input
                id="table-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Description..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                <Plus className="h-3 w-3 mr-1" />
                Add Column
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Column name"
                    value={col.name}
                    onChange={(e) => updateColumn(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={col.type}
                    onValueChange={(v) => updateColumn(i, "type", v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={col.nullable}
                      onCheckedChange={(v) => updateColumn(i, "nullable", v)}
                    />
                    <span className="text-xs text-muted-foreground w-12">
                      {col.nullable ? "NULL" : "NOT NULL"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeColumn(i)}
                    disabled={columns.length === 1}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

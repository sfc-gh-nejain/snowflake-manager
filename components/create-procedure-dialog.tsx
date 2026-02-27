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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";

interface ProcArg {
  name: string;
  type: string;
}

interface CreateProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: string;
  schema: string;
  onCreated: () => void;
}

const ARG_TYPES = [
  "VARCHAR", "NUMBER", "INTEGER", "FLOAT", "BOOLEAN",
  "DATE", "TIMESTAMP", "VARIANT", "ARRAY", "OBJECT",
];

export function CreateProcedureDialog({
  open,
  onOpenChange,
  database,
  schema,
  onCreated,
}: CreateProcedureDialogProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("SQL");
  const [returns, setReturns] = useState("VARCHAR");
  const [args, setArgs] = useState<ProcArg[]>([]);
  const [body, setBody] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addArg = () => {
    setArgs([...args, { name: "", type: "VARCHAR" }]);
  };

  const removeArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const updateArg = (index: number, field: keyof ProcArg, value: string) => {
    const updated = [...args];
    updated[index] = { ...updated[index], [field]: value };
    setArgs(updated);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Procedure name is required"); return; }
    if (!body.trim()) { setError("Procedure body is required"); return; }
    if (args.some((a) => !a.name.trim())) {
      setError("All arguments must have a name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database, schema, name,
          arguments: args,
          returns, language, body, comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create procedure");
      setName("");
      setLanguage("SQL");
      setReturns("VARCHAR");
      setArgs([]);
      setBody("");
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Procedure in {database}.{schema}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proc-name">Procedure Name</Label>
              <Input
                id="proc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MY_PROCEDURE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-lang">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="proc-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SQL">SQL</SelectItem>
                  <SelectItem value="JAVASCRIPT">JavaScript</SelectItem>
                  <SelectItem value="PYTHON">Python</SelectItem>
                  <SelectItem value="JAVA">Java</SelectItem>
                  <SelectItem value="SCALA">Scala</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-returns">Returns</Label>
              <Input
                id="proc-returns"
                value={returns}
                onChange={(e) => setReturns(e.target.value)}
                placeholder="VARCHAR"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Arguments</Label>
              <Button type="button" variant="outline" size="sm" onClick={addArg}>
                <Plus className="h-3 w-3 mr-1" />
                Add Argument
              </Button>
            </div>
            {args.length === 0 && (
              <p className="text-sm text-muted-foreground">No arguments (click Add to add one)</p>
            )}
            <div className="space-y-2">
              {args.map((arg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Argument name"
                    value={arg.name}
                    onChange={(e) => updateArg(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={arg.type}
                    onValueChange={(v) => updateArg(i, "type", v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARG_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeArg(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proc-body">Body</Label>
            <Textarea
              id="proc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={language === "SQL" ? "BEGIN\n  RETURN 'Hello';\nEND;" : "// Your code here"}
              className="font-mono min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proc-comment">Comment (optional)</Label>
            <Input
              id="proc-comment"
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
            Create Procedure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

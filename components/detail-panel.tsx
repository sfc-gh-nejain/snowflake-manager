"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { Table2, Eye, Clock, Activity, Code, Columns3, Plus, Trash2, Pencil, Loader2, Play, Pause } from "lucide-react";

interface DetailPanelProps {
  object: Record<string, unknown> | null;
  type: "table" | "view" | "task" | "stream" | "procedure";
  columns?: { name: string; type: string; nullable: string; default: string; comment: string }[];
  loading: boolean;
  database: string;
  schema: string;
  onRefresh?: () => void;
}

const TYPE_ICONS = {
  table: Table2,
  view: Eye,
  task: Clock,
  stream: Activity,
  procedure: Code,
};

const COLUMN_TYPES = [
  "VARCHAR", "NUMBER", "INTEGER", "FLOAT", "BOOLEAN",
  "DATE", "TIMESTAMP", "TIMESTAMP_NTZ", "VARIANT", "ARRAY", "OBJECT",
];

function has(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] !== undefined && obj[key] !== null && obj[key] !== "";
}

function val(obj: Record<string, unknown>, key: string): string {
  return String(obj[key] ?? "");
}

export function DetailPanel({ object, type, columns, loading, database, schema, onRefresh }: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Table edit state
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("VARCHAR");

  // Task edit state
  const [editSchedule, setEditSchedule] = useState("");
  const [editWarehouse, setEditWarehouse] = useState("");

  if (!object) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Columns3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p>Select an object to view details</p>
        </div>
      </div>
    );
  }

  const Icon = TYPE_ICONS[type];
  const objectName = String(object.name);

  const clearMessages = () => { setActionError(""); setActionSuccess(""); };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    clearMessages();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(objectName)}/alter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, action: "add_column", column: { name: newColName.trim(), type: newColType } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(`Column "${newColName}" added.`);
      setNewColName("");
      setNewColType("VARCHAR");
      onRefresh?.();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDropColumn = async (colName: string) => {
    clearMessages();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(objectName)}/alter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, schema, action: "drop_column", column: { name: colName } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(`Column "${colName}" dropped.`);
      onRefresh?.();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTaskAction = async (action: string) => {
    clearMessages();
    setActionLoading(true);
    try {
      const body: Record<string, string> = { database, schema, name: objectName, action };
      if (action === "update") {
        if (editSchedule.trim()) body.schedule = editSchedule.trim();
        if (editWarehouse.trim()) body.warehouse = editWarehouse.trim();
      }
      const res = await fetch("/api/tasks/alter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionSuccess(data.message || `Task ${action}d.`);
      onRefresh?.();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">{objectName}</h2>
              <p className="text-sm text-muted-foreground">
                {String(object.database_name || "")}.{String(object.schema_name || "")}
              </p>
            </div>
          </div>
          {(type === "table" || type === "task") && (
            <Button
              variant={editing ? "secondary" : "outline"}
              size="sm"
              onClick={() => { setEditing(!editing); clearMessages(); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {editing ? "Done" : "Edit"}
            </Button>
          )}
        </div>

        {(actionError || actionSuccess) && (
          <div className={`text-sm px-3 py-2 rounded-md ${actionError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {actionError || actionSuccess}
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {has(object, "owner") && (
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p className="font-medium">{val(object, "owner")}</p>
            </div>
          )}
          {has(object, "created_on") && (
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="font-medium">{val(object, "created_on")}</p>
            </div>
          )}
          {type === "table" && (
            <>
              {has(object, "rows") && (
                <div>
                  <span className="text-muted-foreground">Rows</span>
                  <p className="font-medium">{val(object, "rows")}</p>
                </div>
              )}
              {has(object, "kind") && (
                <div>
                  <span className="text-muted-foreground">Kind</span>
                  <p className="font-medium">{val(object, "kind")}</p>
                </div>
              )}
            </>
          )}
          {type === "task" && (
            <>
              {has(object, "state") && (
                <div>
                  <span className="text-muted-foreground">State</span>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        val(object, "state") === "started"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {val(object, "state")}
                    </Badge>
                  </div>
                </div>
              )}
              {has(object, "schedule") && (
                <div>
                  <span className="text-muted-foreground">Schedule</span>
                  <p className="font-medium">{val(object, "schedule")}</p>
                </div>
              )}
              {has(object, "warehouse") && (
                <div>
                  <span className="text-muted-foreground">Warehouse</span>
                  <p className="font-medium">{val(object, "warehouse")}</p>
                </div>
              )}
            </>
          )}
          {type === "stream" && (
            <>
              {has(object, "table_name") && (
                <div>
                  <span className="text-muted-foreground">Source Table</span>
                  <p className="font-medium">{val(object, "table_name")}</p>
                </div>
              )}
              {has(object, "source_type") && (
                <div>
                  <span className="text-muted-foreground">Source Type</span>
                  <p className="font-medium">{val(object, "source_type")}</p>
                </div>
              )}
              {has(object, "mode") && (
                <div>
                  <span className="text-muted-foreground">Mode</span>
                  <p className="font-medium">{val(object, "mode")}</p>
                </div>
              )}
              {has(object, "stale") && (
                <div>
                  <span className="text-muted-foreground">Stale</span>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        val(object, "stale") === "true"
                          ? "destructive"
                          : "default"
                      }
                    >
                      {val(object, "stale") === "true" ? "Stale" : "Fresh"}
                    </Badge>
                  </div>
                </div>
              )}
            </>
          )}
          {type === "procedure" && (
            <>
              {has(object, "arguments") && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Arguments</span>
                  <p className="font-medium font-mono text-xs">{val(object, "arguments")}</p>
                </div>
              )}
              {has(object, "description") && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Description</span>
                  <p className="font-medium">{val(object, "description")}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Task edit controls */}
        {type === "task" && editing && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Edit Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTaskAction("resume")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTaskAction("suspend")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
                  Suspend
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs">New Schedule</Label>
                <Input
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  placeholder={val(object, "schedule") || "60 MINUTE"}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">New Warehouse</Label>
                <Input
                  value={editWarehouse}
                  onChange={(e) => setEditWarehouse(e.target.value)}
                  placeholder={val(object, "warehouse") || "COMPUTE_WH"}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleTaskAction("update")}
                disabled={actionLoading || (!editSchedule.trim() && !editWarehouse.trim())}
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Apply Changes
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stream note */}
        {type === "stream" && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                Streams cannot be altered after creation. To change a stream, drop and recreate it.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Table columns detail */}
        {type === "table" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Columns</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : columns && columns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Comment</TableHead>
                      {editing && <TableHead className="w-[50px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((col, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs font-medium">
                          {col.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {col.type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={col.nullable === "Y" ? "secondary" : "outline"}>
                            {col.nullable === "Y" ? "YES" : "NO"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{col.default || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {col.comment || "—"}
                        </TableCell>
                        {editing && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDropColumn(col.name)}
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No column data available</p>
              )}

              {/* Add column form */}
              {editing && (
                <div className="mt-3 pt-3 border-t flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Column Name</Label>
                    <Input
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="new_column"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-[140px] space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={newColType} onValueChange={setNewColType}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="h-8" onClick={handleAddColumn} disabled={actionLoading || !newColName.trim()}>
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* View definition */}
        {type === "view" && has(object, "text") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {val(object, "text")}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Task definition */}
        {type === "task" && has(object, "definition") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {val(object, "definition")}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

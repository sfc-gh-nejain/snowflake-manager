"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectBrowserProps {
  title: string;
  objects: Record<string, unknown>[];
  columns: { key: string; label: string; width?: string }[];
  onSelect: (obj: Record<string, unknown>) => void;
  selectedObject: Record<string, unknown> | null;
  onCreateNew: () => void;
  loading: boolean;
  icon: React.ReactNode;
}

export function ObjectBrowser({
  title,
  objects,
  columns,
  onSelect,
  selectedObject,
  onCreateNew,
  loading,
  icon,
}: ObjectBrowserProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return objects;
    const lower = search.toLowerCase();
    return objects.filter((obj) =>
      String(obj.name || "")
        .toLowerCase()
        .includes(lower)
    );
  }, [objects, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="text-sm text-muted-foreground">
              ({objects.length})
            </span>
          </div>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No {title.toLowerCase()} found</p>
            {search && (
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your search
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} style={{ width: col.width }}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((obj, i) => (
                <TableRow
                  key={i}
                  className={cn(
                    "cursor-pointer",
                    selectedObject?.name === obj.name &&
                      "bg-primary/5 hover:bg-primary/10"
                  )}
                  onClick={() => onSelect(obj)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="truncate max-w-[200px]">
                      {String(obj[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Snowflake,
  Table2,
  Eye,
  Clock,
  Activity,
  Code,
  LayoutDashboard,
  Workflow,
  ArrowRight,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tables", label: "Tables", icon: Table2 },
  { key: "views", label: "Views", icon: Eye },
  { key: "tasks", label: "Tasks", icon: Clock },
  { key: "streams", label: "Streams", icon: Activity },
  { key: "procedures", label: "Procedures", icon: Code },
  { key: "pipeline", label: "Pipeline Builder", icon: Workflow },
];

interface AppSidebarProps {
  schemas: string[];
  selectedDatabase: string;
  selectedSchema: string;
  onDatabaseChange: (db: string) => void;
  onSchemaChange: (schema: string) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AppSidebar({
  schemas,
  selectedDatabase,
  selectedSchema,
  onDatabaseChange,
  onSchemaChange,
  activeSection,
  onSectionChange,
}: AppSidebarProps) {
  const [dbInput, setDbInput] = useState(selectedDatabase);

  const handleDbSubmit = () => {
    const trimmed = dbInput.trim().toUpperCase();
    if (trimmed) {
      onDatabaseChange(trimmed);
    }
  };

  const handleDbKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDbSubmit();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Snowflake className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-semibold">Snowflake Manager</span>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Context</SidebarGroupLabel>
          <div className="px-2 space-y-2">
            <div className="flex gap-1.5">
              <Input
                value={dbInput}
                onChange={(e) => setDbInput(e.target.value)}
                onKeyDown={handleDbKeyDown}
                placeholder="Database name..."
                className="h-8 text-sm bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 border-sidebar-border"
                onClick={handleDbSubmit}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Select value={selectedSchema} onValueChange={onSchemaChange}>
              <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder="Schema" />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Objects</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  isActive={activeSection === key}
                  onClick={() => onSectionChange(key)}
                  tooltip={label}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="text-xs text-sidebar-foreground/50">
          Snowflake Object Manager
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

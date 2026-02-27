"use client";

import { useEffect, useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ObjectBrowser } from "@/components/object-browser";
import { DetailPanel } from "@/components/detail-panel";
import { CreateTableDialog } from "@/components/create-table-dialog";
import { CreateViewDialog } from "@/components/create-view-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { CreateStreamDialog } from "@/components/create-stream-dialog";
import { CreateProcedureDialog } from "@/components/create-procedure-dialog";
import { PipelineCanvas } from "@/components/pipeline/pipeline-canvas";
import {
  Table2,
  Eye,
  Clock,
  Activity,
  Code,
  Database,
  Layers,
  ListTodo,
  Radio,
  FileCode,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Section = "dashboard" | "tables" | "views" | "tasks" | "streams" | "procedures" | "pipeline";

interface OverviewCounts {
  tables: number;
  views: number;
  tasks: number;
  streams: number;
  procedures: number;
}

const SECTION_CONFIG: Record<
  Exclude<Section, "dashboard" | "pipeline">,
  { endpoint: string; columns: { key: string; label: string }[]; icon: React.ReactNode }
> = {
  tables: {
    endpoint: "/api/tables",
    columns: [
      { key: "name", label: "Name" },
      { key: "kind", label: "Kind" },
      { key: "rows", label: "Rows" },
      { key: "owner", label: "Owner" },
    ],
    icon: <Table2 className="h-4 w-4" />,
  },
  views: {
    endpoint: "/api/views",
    columns: [
      { key: "name", label: "Name" },
      { key: "owner", label: "Owner" },
      { key: "created_on", label: "Created" },
    ],
    icon: <Eye className="h-4 w-4" />,
  },
  tasks: {
    endpoint: "/api/tasks",
    columns: [
      { key: "name", label: "Name" },
      { key: "schedule", label: "Schedule" },
      { key: "state", label: "State" },
      { key: "warehouse", label: "Warehouse" },
    ],
    icon: <Clock className="h-4 w-4" />,
  },
  streams: {
    endpoint: "/api/streams",
    columns: [
      { key: "name", label: "Name" },
      { key: "table_name", label: "Source" },
      { key: "source_type", label: "Type" },
      { key: "mode", label: "Mode" },
    ],
    icon: <Activity className="h-4 w-4" />,
  },
  procedures: {
    endpoint: "/api/procedures",
    columns: [
      { key: "name", label: "Name" },
      { key: "arguments", label: "Arguments" },
      { key: "description", label: "Description" },
    ],
    icon: <Code className="h-4 w-4" />,
  },
};

const DASHBOARD_CARDS = [
  { key: "tables" as const, label: "Tables", icon: Table2, color: "text-blue-500" },
  { key: "views" as const, label: "Views", icon: Eye, color: "text-cyan-500" },
  { key: "tasks" as const, label: "Tasks", icon: ListTodo, color: "text-amber-500" },
  { key: "streams" as const, label: "Streams", icon: Radio, color: "text-green-500" },
  { key: "procedures" as const, label: "Procedures", icon: FileCode, color: "text-purple-500" },
];

export default function Home() {
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("pipeline");
  const [objects, setObjects] = useState<Record<string, unknown>[]>([]);
  const [selectedObject, setSelectedObject] = useState<Record<string, unknown> | null>(null);
  const [objectDetails, setObjectDetails] = useState<
    { name: string; type: string; nullable: string; default: string; comment: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overviewCounts, setOverviewCounts] = useState<OverviewCounts | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch schemas when database changes
  useEffect(() => {
    if (!selectedDatabase) return;
    setSchemas([]);
    setSelectedSchema("");
    fetch(`/api/schemas?database=${encodeURIComponent(selectedDatabase)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const names = data.map((s: Record<string, unknown>) => s.name as string);
          setSchemas(names);
          if (names.length > 0) {
            setSelectedSchema(names[0]);
          }
        }
      })
      .catch(console.error);
  }, [selectedDatabase]);

  // Fetch objects or overview when section/database/schema changes
  const fetchObjects = useCallback(() => {
    if (!selectedDatabase || !selectedSchema) return;

    if (activeSection === "dashboard") {
      setOverviewLoading(true);
      fetch(
        `/api/overview?database=${encodeURIComponent(selectedDatabase)}&schema=${encodeURIComponent(selectedSchema)}`
      )
        .then((r) => r.json())
        .then((data) => setOverviewCounts(data))
        .catch(console.error)
        .finally(() => setOverviewLoading(false));
      return;
    }

    if (activeSection === "pipeline") return;

    const config = SECTION_CONFIG[activeSection];
    setLoading(true);
    setSelectedObject(null);
    setObjectDetails([]);
    fetch(
      `${config.endpoint}?database=${encodeURIComponent(selectedDatabase)}&schema=${encodeURIComponent(selectedSchema)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setObjects(data);
        } else {
          setObjects([]);
        }
      })
      .catch(() => setObjects([]))
      .finally(() => setLoading(false));
  }, [selectedDatabase, selectedSchema, activeSection]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  // Fetch details when an object is selected
  useEffect(() => {
    if (!selectedObject || activeSection === "dashboard") return;

    if (activeSection === "tables") {
      setDetailLoading(true);
      const name = selectedObject.name as string;
      fetch(
        `/api/tables/${encodeURIComponent(name)}?database=${encodeURIComponent(selectedDatabase)}&schema=${encodeURIComponent(selectedSchema)}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setObjectDetails(data);
          }
        })
        .catch(console.error)
        .finally(() => setDetailLoading(false));
    } else {
      setDetailLoading(false);
    }
  }, [selectedObject, activeSection, selectedDatabase, selectedSchema]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section as Section);
    setSelectedObject(null);
    setObjectDetails([]);
  };

  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {selectedDatabase && selectedSchema
            ? `${selectedDatabase}.${selectedSchema}`
            : "Select a database and schema to get started"}
        </p>
      </div>

      {selectedDatabase && selectedSchema && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {DASHBOARD_CARDS.map(({ key, label, icon: Icon, color }) => (
            <Card
              key={key}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => handleSectionChange(key)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {overviewCounts ? overviewCounts[key] : "—"}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDatabase && selectedSchema && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Connection Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Database</span>
                <p className="font-medium">{selectedDatabase}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Schema</span>
                <p className="font-medium">{selectedSchema}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedDatabase && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium">No Database Selected</h3>
            <p className="text-muted-foreground mt-1">
              Select a database and schema from the sidebar to start browsing objects.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCreateDialog = () => {
    const props = {
      open: createDialogOpen,
      onOpenChange: setCreateDialogOpen,
      database: selectedDatabase,
      schema: selectedSchema,
      onCreated: () => {
        setCreateDialogOpen(false);
        fetchObjects();
      },
    };

    switch (activeSection) {
      case "tables":
        return <CreateTableDialog {...props} />;
      case "views":
        return <CreateViewDialog {...props} />;
      case "tasks":
        return <CreateTaskDialog {...props} />;
      case "streams":
        return <CreateStreamDialog {...props} />;
      case "procedures":
        return <CreateProcedureDialog {...props} />;
      default:
        return null;
    }
  };

  const renderObjectView = () => {
    if (activeSection === "dashboard") return renderDashboard();

    if (activeSection === "pipeline") {
      return (
        <div className="h-[calc(100vh-1px)]">
          <PipelineCanvas database={selectedDatabase} schema={selectedSchema} />
        </div>
      );
    }

    const config = SECTION_CONFIG[activeSection];

    return (
      <div className="flex h-[calc(100vh-1px)] overflow-hidden">
        <div className="w-[480px] min-w-[480px] border-r">
          <ObjectBrowser
            title={activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            objects={objects}
            columns={config.columns}
            onSelect={setSelectedObject}
            selectedObject={selectedObject}
            onCreateNew={() => setCreateDialogOpen(true)}
            loading={loading}
            icon={config.icon}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <DetailPanel
            object={selectedObject}
            type={activeSection as "table" | "view" | "task" | "stream" | "procedure"}
            columns={objectDetails}
            loading={detailLoading}
            database={selectedDatabase}
            schema={selectedSchema}
            onRefresh={fetchObjects}
          />
        </div>
        {renderCreateDialog()}
      </div>
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar
        schemas={schemas}
        selectedDatabase={selectedDatabase}
        selectedSchema={selectedSchema}
        onDatabaseChange={setSelectedDatabase}
        onSchemaChange={setSelectedSchema}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <SidebarInset>{renderObjectView()}</SidebarInset>
    </SidebarProvider>
  );
}

# Snowflake Manager

A web application for browsing, creating, and managing Snowflake objects with a visual drag-and-drop Pipeline Builder and an AI-powered assistant. Built with Next.js and deployable to Snowpark Container Services (SPCS).

## Features

### Object Browser
- **Tables** — View all tables in a schema, inspect columns/types, preview data (top 100 rows), create new tables with column definitions, alter existing tables (add/drop/rename columns, rename table)
- **Views** — List and create views with custom SQL definitions
- **Stages** — List and create internal stages with optional directory table support
- **Streams** — List and create streams on tables or stages (`CREATE STREAM ... ON TABLE` / `ON STAGE`)
- **Tasks** — List, create, suspend, and resume tasks with cron or interval schedules and custom SQL
- **Stored Procedures** — List and create JavaScript or SQL stored procedures with parameter definitions

### Pipeline Builder
A visual drag-and-drop canvas for designing Snowflake data pipelines:

- **Drag-and-drop nodes** — Drag Stages, Tables, Tasks, Streams, and AI function nodes (AI_EXTRACT, AI_CLASSIFY, AI_PARSE_DOCUMENT, AI_SUMMARIZE, AI_SENTIMENT) from the sidebar onto the canvas
- **Connect nodes** — Draw edges between nodes to define data flow
- **Node configuration** — Click any node to configure its properties (name, columns, schedule, source stage, etc.) in the right panel
- **Deploy Pipeline** — One-click deployment generates and executes all `CREATE` SQL statements in dependency order
- **Save / Load configs** — Save pipeline layouts to a Snowflake VARIANT table and reload them later
- **Stream-on-Stage support** — Streams can be configured to watch a stage (from existing stages or other pipeline nodes)

### AI Assistant (Chatbot)
An integrated chatbot in the Pipeline Builder right panel powered by Snowflake Cortex `AI_COMPLETE` (`claude-4-sonnet`):

- Describe a pipeline in plain English (e.g., *"Build a pipeline to process PDF invoices"*)
- The AI returns structured JSON that automatically creates nodes and edges on the canvas
- Supports follow-up questions and general Snowflake Q&A
- Multi-line text input with suggestion prompts

### Dashboard Overview
- Aggregated counts of all object types (tables, views, stages, streams, tasks, procedures) in the selected database/schema

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS v4, shadcn/ui (new-york style)
- **Pipeline Canvas**: @xyflow/react (React Flow v12)
- **Snowflake SDK**: snowflake-sdk (server-side)
- **AI**: Snowflake Cortex AI_COMPLETE

## Getting Started

### Prerequisites
- Node.js 22+
- A Snowflake account with `EXTERNALBROWSER` auth configured

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a database name and select a schema to start browsing.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SNOWFLAKE_ACCOUNT` | Snowflake account identifier | `PM-PM_AWS_US_WEST_2` |
| `SNOWFLAKE_WAREHOUSE` | Warehouse for queries | `HLEVEL1` |
| `SNOWFLAKE_USER` | Snowflake username | `NEJAIN` |
| `SNOWFLAKE_HOST` | Snowflake host (SPCS only) | — |

In SPCS, OAuth tokens are read automatically from `/snowflake/session/token`.

## Deploying to SPCS

### 1. Build and push the Docker image

```bash
docker build --platform linux/amd64 -t snowflake-manager:latest .

docker tag snowflake-manager:latest \
  <registry_url>/<db>/<schema>/<repo>/snowflake-manager:latest

snow spcs image-registry login --connection <conn>

docker push <registry_url>/<db>/<schema>/<repo>/snowflake-manager:latest
```

### 2. Upload the service spec

```bash
snow stage copy service_spec.yaml @<db>.<schema>.SPECS --overwrite --connection <conn>
```

### 3. Create or update the service

```sql
-- First time
CREATE SERVICE <db>.<schema>.SNOWFLAKE_MANAGER_SERVICE
  IN COMPUTE POOL <pool>
  FROM @<db>.<schema>.SPECS
  SPECIFICATION_FILE = 'service_spec.yaml';

-- Subsequent deploys
ALTER SERVICE <db>.<schema>.SNOWFLAKE_MANAGER_SERVICE
  FROM @<db>.<schema>.SPECS
  SPECIFICATION_FILE = 'service_spec.yaml';
```

### 4. Grant access

```sql
GRANT USAGE ON SERVICE <db>.<schema>.SNOWFLAKE_MANAGER_SERVICE TO ROLE <role>;
```

## Project Structure

```
app/
  api/
    databases/       # List databases
    schemas/         # List schemas
    overview/        # Object counts dashboard
    tables/          # CRUD for tables
    views/           # CRUD for views
    stages/          # CRUD for stages
    streams/         # CRUD for streams (table & stage sources)
    tasks/           # CRUD + suspend/resume for tasks
    procedures/      # CRUD for stored procedures
    pipeline/        # Deploy pipeline, save/load configs
    pipeline/chat/   # AI chatbot endpoint (Cortex AI_COMPLETE)
  page.tsx           # Main app page
components/
  app-sidebar.tsx    # Navigation sidebar (database/schema selector)
  object-browser.tsx # Object list + create dialogs
  detail-panel.tsx   # Object detail/edit panel
  create-*-dialog.tsx # Create dialogs for each object type
  pipeline/
    pipeline-canvas.tsx   # React Flow canvas + AI chatbot
    pipeline-sidebar.tsx  # Draggable node palette
    node-config-panel.tsx # Node configuration panel
    custom-nodes.tsx      # Node type definitions + visuals
lib/
  snowflake.ts       # Snowflake SDK connection + query helpers
```

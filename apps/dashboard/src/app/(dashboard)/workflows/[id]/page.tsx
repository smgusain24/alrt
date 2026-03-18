"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui";
import { Save, Upload, ArrowLeft, LayoutGrid, Copy, Check } from "lucide-react";
import NodePalette from "@/components/workflow/NodePalette";
import ConfigPanel from "@/components/workflow/ConfigPanel";
import { TriggerNode, ChannelNode, DelayNode, ConditionNode } from "@/components/workflow/nodes";
import useUndoRedo from "@/components/workflow/useUndoRedo";
import useKeyboardShortcuts from "@/components/workflow/useKeyboardShortcuts";
import useValidation from "@/components/workflow/useValidation";

const NODE_TYPES = {
  trigger: TriggerNode,
  channel: ChannelNode,
  delay: DelayNode,
  condition: ConditionNode,
};

const DEFAULT_EDGE_OPTIONS = {
  animated: false,
  type: "smoothstep" as const,
  style: { stroke: "rgba(255, 255, 255, 0.12)", strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "rgba(255, 255, 255, 0.12)",
    width: 20,
    height: 20,
  },
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

function formatTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function WorkflowBuilderInner() {
  const params = useParams();
  const workflowId = params.id as string;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [workflow, setWorkflow] = useState<any>(null);
  const [category, setCategory] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedText, setLastSavedText] = useState("");
  const savedDefinitionRef = useRef<string>("");

  // Hooks
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo();
  const { validateWorkflow, isValidConnection: checkConnection } = useValidation();

  // Update "last saved" text every 30s
  useEffect(() => {
    if (!lastSaved) return;
    const update = () => setLastSavedText(formatTimeAgo(lastSaved));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Track dirty state
  useEffect(() => {
    if (!savedDefinitionRef.current) return;
    const current = JSON.stringify({ nodes, edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })) });
    setIsDirty(current !== savedDefinitionRef.current);
  }, [nodes, edges]);

  // Load workflow
  useEffect(() => {
    api.workflows.get(workflowId).then((data: any) => {
      setWorkflow(data);
      setCategory(data.category || "");
      const def = data.definition || {};
      const loadedNodes = (def.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position || { x: 250, y: 0 },
        data: n.data || {},
      }));
      const loadedEdges = (def.edges || []).map((e: any) => ({
        ...e,
        ...DEFAULT_EDGE_OPTIONS,
      }));

      // If no nodes, auto-create a trigger
      if (loadedNodes.length === 0) {
        loadedNodes.push({
          id: getNodeId(),
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { event_name: data.event_name || "" },
        });
      }

      setNodes(loadedNodes);
      setEdges(loadedEdges);

      const defStr = JSON.stringify({
        nodes: loadedNodes,
        edges: (def.edges || []).map((e: any) => ({ id: e.id, source: e.source, target: e.target })),
      });
      savedDefinitionRef.current = defStr;
      setLastSaved(new Date());
    });
  }, [workflowId]);

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        takeSnapshot(updated, edges);
        return updated;
      });
    },
    [edges, takeSnapshot]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        takeSnapshot(nodes, updated);
        return updated;
      });
    },
    [nodes, takeSnapshot]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source &&
        connection.target &&
        !checkConnection(connection.source, connection.target, nodes, edges)
      ) {
        return;
      }
      setEdges((eds) => {
        const updated = addEdge({ ...connection, ...DEFAULT_EDGE_OPTIONS }, eds);
        takeSnapshot(nodes, updated);
        return updated;
      });
      // Auto-open config if connecting a channel node
      if (connection.target) {
        const targetNode = nodes.find((n) => n.id === connection.target);
        if (targetNode?.type === "channel") {
          setSelectedNode(targetNode);
        }
      }
    },
    [nodes, edges, checkConnection, takeSnapshot]
  );

  const isValidConnectionHandler = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      return checkConnection(connection.source, connection.target, nodes, edges);
    },
    [nodes, edges, checkConnection]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawType = event.dataTransfer.getData("application/reactflow");
      if (!rawType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let type = rawType;
      let data: any = {};

      if (rawType.startsWith("channel_")) {
        type = "channel";
        data = { channel: rawType.replace("channel_", ""), template: {} };
      } else if (rawType === "trigger") {
        if (nodes.some((n) => n.type === "trigger")) return;
        data = { event_name: workflow?.event_name || "" };
      } else if (rawType === "delay") {
        data = { duration_seconds: 300 };
      } else if (rawType === "condition") {
        data = { field: "", operator: "equals", value: "" };
      }

      const newNode: Node = { id: getNodeId(), type, position, data };
      setNodes((nds) => {
        const updated = [...nds, newNode];
        takeSnapshot(updated, edges);
        return updated;
      });

      // Auto-open config for channel nodes
      if (type === "channel") {
        setSelectedNode(newNode);
      }
    },
    [screenToFlowPosition, workflow, nodes, edges, takeSnapshot]
  );

  // Update node data
  const handleNodeUpdate = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
    );
    setSelectedNode((prev) =>
      prev && prev.id === nodeId ? { ...prev, data: newData } : prev
    );
  }, []);

  // Delete node
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        takeSnapshot(updated, edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
        return updated;
      });
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [edges, takeSnapshot]
  );

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const definition = {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      };
      await api.workflows.update(workflowId, { definition, category: category || undefined });
      setWorkflow((prev: any) => ({ ...prev, definition, category }));
      savedDefinitionRef.current = JSON.stringify({
        nodes: definition.nodes,
        edges: definition.edges,
      });
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowId, category]);

  // Publish
  const handlePublish = async () => {
    // Validate first
    const issues = validateWorkflow(nodes, edges);
    const errors = issues.filter((i) => i.type === "error");
    if (errors.length > 0) {
      alert("Cannot publish:\n" + errors.map((e) => `- ${e.message}`).join("\n"));
      return;
    }
    setPublishing(true);
    try {
      await handleSave();
      await api.workflows.publish(workflowId);
      setWorkflow((prev: any) => ({ ...prev, status: "published" }));
    } catch (err: any) {
      alert("Publish failed: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Copy curl
  const handleCopyCurl = useCallback(() => {
    const curl = `curl -X POST http://localhost:8000/events/trigger \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "${workflow?.event_name || "EVENT_NAME"}",
    "subscriber_id": "SUBSCRIBER_EXTERNAL_ID",
    "payload": {
      "name": "Jane",
      "message": "Hello from Alrt!"
    }
  }'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }, [workflow]);

  // Auto-arrange
  const handleAutoArrange = useCallback(() => {
    if (nodes.length === 0) return;
    const childMap: Record<string, string[]> = {};
    const parentMap: Record<string, string[]> = {};
    for (const e of edges) {
      if (!childMap[e.source]) childMap[e.source] = [];
      childMap[e.source].push(e.target);
      if (!parentMap[e.target]) parentMap[e.target] = [];
      parentMap[e.target].push(e.source);
    }
    const roots = nodes.filter((n) => !parentMap[n.id] || parentMap[n.id].length === 0);
    const levels: Record<string, number> = {};
    const queue: string[] = roots.map((n) => n.id);
    roots.forEach((n) => (levels[n.id] = 0));
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of childMap[current] || []) {
        const newLevel = (levels[current] || 0) + 1;
        if (levels[child] === undefined || newLevel > levels[child]) levels[child] = newLevel;
        queue.push(child);
      }
    }
    for (const n of nodes) {
      if (levels[n.id] === undefined) levels[n.id] = 0;
    }
    const byLevel: Record<number, string[]> = {};
    for (const [id, level] of Object.entries(levels)) {
      if (!byLevel[level]) byLevel[level] = [];
      byLevel[level].push(id);
    }
    const NODE_WIDTH = 200, H_GAP = 60, V_GAP = 100, NODE_HEIGHT = 80;
    const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
    const newPositions: Record<string, { x: number; y: number }> = {};
    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = byLevel[level] || [];
      const totalWidth = nodesAtLevel.length * NODE_WIDTH + (nodesAtLevel.length - 1) * H_GAP;
      const startX = -totalWidth / 2 + NODE_WIDTH / 2;
      nodesAtLevel.forEach((id, i) => {
        newPositions[id] = { x: startX + i * (NODE_WIDTH + H_GAP), y: level * (NODE_HEIGHT + V_GAP) };
      });
    }
    setNodes((nds) => nds.map((n) => ({ ...n, position: newPositions[n.id] || n.position })));
    setTimeout(() => {
      const fitViewBtn = document.querySelector(".react-flow__controls-fitview") as HTMLButtonElement;
      fitViewBtn?.click();
    }, 100);
  }, [nodes, edges]);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      onSave: () => handleSave(),
      onUndo: () => undo(nodes, edges, setNodes, setEdges),
      onRedo: () => redo(setNodes, setEdges, nodes, edges),
      onDelete: () => {
        if (selectedNode) handleNodeDelete(selectedNode.id);
      },
      onEscape: () => setSelectedNode(null),
    }),
    [handleSave, undo, redo, nodes, edges, selectedNode, handleNodeDelete]
  );
  useKeyboardShortcuts(shortcutHandlers);

  if (!workflow) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div aria-busy="true"></div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/workflows"
            style={{ color: "var(--color-text-muted)", padding: 4, display: "inline-flex" }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2} />
          </a>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>/</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Workflows</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>/</span>
          <h1 style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{workflow.name}</h1>
          <Badge variant={workflow.status === "published" ? "success" : "warning"}>
            {workflow.status}
          </Badge>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
            <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", flexShrink: 0 }}>Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. marketing"
              style={{
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                fontSize: "0.75rem",
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid var(--color-border)",
                outline: "none",
                width: 112,
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="ghost small" onClick={handleCopyCurl}>
            {copiedCurl ? (
              <><Check style={{ width: 14, height: 14, marginRight: 6, color: "var(--color-success)" }} strokeWidth={3} />Copied</>
            ) : (
              <><Copy style={{ width: 14, height: 14, marginRight: 6 }} strokeWidth={2} />cURL</>
            )}
          </button>
          <button className="ghost small" onClick={handleAutoArrange}>
            <LayoutGrid style={{ width: 14, height: 14, marginRight: 6 }} strokeWidth={2} />
            Arrange
          </button>
          <button className="outline small" onClick={handleSave} disabled={saving}>
            <Save style={{ width: 14, height: 14, marginRight: 6 }} strokeWidth={2} />
            {saving ? "Saving..." : "Save"}
            {isDirty && !saving && (
              <span style={{
                marginLeft: 6,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-warning)",
                display: "inline-block",
              }} />
            )}
          </button>
          {workflow.status !== "published" && (
            <button onClick={handlePublish} disabled={publishing}>
              <Upload style={{ width: 14, height: 14, marginRight: 6 }} strokeWidth={2} />
              {publishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Builder area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, position: "relative" }}>
        <NodePalette />

        <div
          style={{ flex: 1 }}
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnectionHandler}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            connectionLineStyle={{ stroke: "#3EA369", strokeWidth: 1.5 }}
            connectionLineType={"smoothstep" as any}
          >
            <Background color="#333" gap={20} size={1} />
            <Controls
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "none",
                borderRadius: 6,
              }}
              showInteractive={false}
            />
            <MiniMap
              nodeStrokeColor="rgba(255,255,255,0.1)"
              nodeColor="#18181b"
              nodeBorderRadius={6}
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            onClose={() => setSelectedNode(null)}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 11,
        color: "var(--color-text-muted)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>{nodes.length} nodes, {edges.length} edges</span>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <span>Cmd+S save &middot; Cmd+Z undo &middot; Del remove</span>
        </div>
        <div>
          {lastSavedText && <span>Last saved {lastSavedText}</span>}
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}

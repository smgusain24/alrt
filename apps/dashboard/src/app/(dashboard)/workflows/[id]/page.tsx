"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
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
import { RetroButton, Badge } from "@/components/retro";
import { Save, Upload, ArrowLeft, LayoutGrid, Copy, Check } from "lucide-react";
import NodePalette from "@/components/workflow/NodePalette";
import ConfigPanel from "@/components/workflow/ConfigPanel";
import { TriggerNode, ChannelNode, DelayNode, ConditionNode } from "@/components/workflow/nodes";

// Memoize nodeTypes OUTSIDE the component to prevent React Flow warnings
const NODE_TYPES = {
  trigger: TriggerNode,
  channel: ChannelNode,
  delay: DelayNode,
  condition: ConditionNode,
};

const DEFAULT_EDGE_OPTIONS = {
  animated: false,
  type: "smoothstep" as const,
  style: { stroke: "#000080", strokeWidth: 3 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#000080",
    width: 24,
    height: 24,
  },
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

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
      setNodes(loadedNodes);
      setEdges(loadedEdges);
    });
  }, [workflowId]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            ...DEFAULT_EDGE_OPTIONS,
          },
          eds
        )
      ),
    []
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Drag and drop from palette
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
        // Only allow one trigger node
        const hasTrigger = nodes.some((n) => n.type === "trigger");
        if (hasTrigger) {
          return; // silently ignore
        }
        data = { event_name: workflow?.event_name || "" };
      } else if (rawType === "delay") {
        data = { duration_seconds: 300 };
      } else if (rawType === "condition") {
        data = { field: "", operator: "equals", value: "" };
      }

      const newNode: Node = {
        id: getNodeId(),
        type,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, workflow, nodes]
  );

  // Update node data from config panel
  const handleNodeUpdate = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
    );
    setSelectedNode((prev) =>
      prev && prev.id === nodeId ? { ...prev, data: newData } : prev
    );
  }, []);

  // Delete node
  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    setSelectedNode(null);
  }, []);

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const definition = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };
      await api.workflows.update(workflowId, { definition, category: category || undefined });
      setWorkflow((prev: any) => ({ ...prev, definition, category }));
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
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

  // Copy curl request
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

  // Auto-arrange: topological sort + vertical layout
  const handleAutoArrange = useCallback(() => {
    if (nodes.length === 0) return;

    // Build adjacency from edges
    const childMap: Record<string, string[]> = {};
    const parentMap: Record<string, string[]> = {};
    const nodeIds = new Set(nodes.map((n) => n.id));

    for (const e of edges) {
      if (!childMap[e.source]) childMap[e.source] = [];
      childMap[e.source].push(e.target);
      if (!parentMap[e.target]) parentMap[e.target] = [];
      parentMap[e.target].push(e.source);
    }

    // Find roots (no incoming edges)
    const roots = nodes.filter((n) => !parentMap[n.id] || parentMap[n.id].length === 0);

    // BFS to determine levels
    const levels: Record<string, number> = {};
    const queue: string[] = roots.map((n) => n.id);
    roots.forEach((n) => (levels[n.id] = 0));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childMap[current] || [];
      for (const child of children) {
        const newLevel = (levels[current] || 0) + 1;
        if (levels[child] === undefined || newLevel > levels[child]) {
          levels[child] = newLevel;
        }
        queue.push(child);
      }
    }

    // Assign level 0 to any disconnected nodes
    for (const n of nodes) {
      if (levels[n.id] === undefined) {
        levels[n.id] = 0;
      }
    }

    // Group nodes by level
    const byLevel: Record<number, string[]> = {};
    for (const [id, level] of Object.entries(levels)) {
      if (!byLevel[level]) byLevel[level] = [];
      byLevel[level].push(id);
    }

    // Layout: center horizontally, space vertically
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 80;
    const H_GAP = 60;
    const V_GAP = 100;

    const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
    const newPositions: Record<string, { x: number; y: number }> = {};

    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = byLevel[level] || [];
      const totalWidth = nodesAtLevel.length * NODE_WIDTH + (nodesAtLevel.length - 1) * H_GAP;
      const startX = -totalWidth / 2 + NODE_WIDTH / 2;

      nodesAtLevel.forEach((id, i) => {
        newPositions[id] = {
          x: startX + i * (NODE_WIDTH + H_GAP),
          y: level * (NODE_HEIGHT + V_GAP),
        };
      });
    }

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        position: newPositions[n.id] || n.position,
      }))
    );

    // Fit view after layout
    setTimeout(() => {
      const fitViewBtn = document.querySelector('.react-flow__controls-fitview') as HTMLButtonElement;
      fitViewBtn?.click();
    }, 100);
  }, [nodes, edges]);

  if (!workflow)
    return <p className="text-muted p-8">Loading workflow...</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Top bar */}
      <div className="bg-white px-4 py-2 flex items-center justify-between bevel-outset shrink-0">
        <div className="flex items-center gap-3">
          <a href="/workflows" className="bevel-outset bg-[#c0c0c0] p-1.5">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </a>
          <h1 className="font-heading text-lg uppercase">{workflow.name}</h1>
          <Badge
            variant={workflow.status === "published" ? "success" : "warning"}
          >
            {workflow.status}
          </Badge>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-bold uppercase text-muted tracking-wide shrink-0">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. marketing"
              className="bevel-inset bg-white text-xs px-2 py-1 font-body focus-retro w-32"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RetroButton variant="default" onClick={handleCopyCurl}>
            {copiedCurl ? (
              <><Check className="w-4 h-4 inline mr-1 text-success" strokeWidth={3} />Copied!</>
            ) : (
              <><Copy className="w-4 h-4 inline mr-1" strokeWidth={2} />Copy API Request</>
            )}
          </RetroButton>
          <RetroButton variant="default" onClick={handleAutoArrange}>
            <LayoutGrid className="w-4 h-4 inline mr-1" strokeWidth={2} />
            Auto-Arrange
          </RetroButton>
          <RetroButton variant="default" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 inline mr-1" strokeWidth={2} />
            {saving ? "Saving..." : "Save"}
          </RetroButton>
          {workflow.status !== "published" && (
            <RetroButton
              variant="accent"
              onClick={handlePublish}
              disabled={publishing}
            >
              <Upload className="w-4 h-4 inline mr-1" strokeWidth={2} />
              {publishing ? "Publishing..." : "Publish"}
            </RetroButton>
          )}
        </div>
      </div>

      {/* Builder area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <NodePalette />

        <div
          className="flex-1"
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            connectionLineStyle={{ stroke: "#000080", strokeWidth: 3 }}
            connectionLineType={"smoothstep" as any}
          >
            <Background color="#b0b0b0" gap={20} size={2} />
            <Controls className="bevel-outset !bg-[#c0c0c0] !border-0 !shadow-none" />
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

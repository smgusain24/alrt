import { useCallback } from "react";
import { Node, Edge } from "reactflow";

export interface ValidationIssue {
  nodeId?: string;
  type: "error" | "warning";
  message: string;
}

export default function useValidation() {
  const validateWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];

      // 1. Must have a trigger node
      const triggers = nodes.filter((n) => n.type === "trigger");
      if (triggers.length === 0) {
        issues.push({ type: "error", message: "Workflow must have a Trigger node" });
      }
      if (triggers.length > 1) {
        issues.push({ type: "error", message: "Only one Trigger node is allowed" });
      }

      // 2. Check templates are configured on channel nodes
      for (const node of nodes) {
        if (node.type === "channel") {
          const d = node.data;
          const ch = d.channel || "in_app";
          if (ch === "in_app" && !d.template?.title) {
            issues.push({
              nodeId: node.id,
              type: "error",
              message: "In-App node missing title",
            });
          }
          if (ch === "email" && !d.template?.subject) {
            issues.push({
              nodeId: node.id,
              type: "error",
              message: "Email node missing subject",
            });
          }
          if (ch === "slack" && !d.template?.text && !d.template?.blocks) {
            issues.push({
              nodeId: node.id,
              type: "error",
              message: "Slack node missing message or blocks",
            });
          }
        }
      }

      // 3. Orphaned nodes (no incoming or outgoing edges, not trigger)
      const connectedIds = new Set<string>();
      for (const e of edges) {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      }
      for (const node of nodes) {
        if (node.type === "trigger") continue;
        if (!connectedIds.has(node.id)) {
          issues.push({
            nodeId: node.id,
            type: "warning",
            message: `${node.type} node is disconnected`,
          });
        }
      }

      // 4. Cycle detection via DFS
      const adj: Record<string, string[]> = {};
      for (const e of edges) {
        if (!adj[e.source]) adj[e.source] = [];
        adj[e.source].push(e.target);
      }

      const visited = new Set<string>();
      const inStack = new Set<string>();
      let hasCycle = false;

      const dfs = (id: string) => {
        if (hasCycle) return;
        visited.add(id);
        inStack.add(id);
        for (const neighbor of adj[id] || []) {
          if (inStack.has(neighbor)) {
            hasCycle = true;
            return;
          }
          if (!visited.has(neighbor)) dfs(neighbor);
        }
        inStack.delete(id);
      };

      for (const node of nodes) {
        if (!visited.has(node.id)) dfs(node.id);
      }
      if (hasCycle) {
        issues.push({ type: "error", message: "Workflow contains a cycle" });
      }

      return issues;
    },
    []
  );

  const isValidConnection = useCallback(
    (
      source: string,
      target: string,
      nodes: Node[],
      edges: Edge[]
    ): boolean => {
      // Prevent self-connections
      if (source === target) return false;

      // Prevent connecting to trigger node
      const targetNode = nodes.find((n) => n.id === target);
      if (targetNode?.type === "trigger") return false;

      // Prevent duplicate edges
      const exists = edges.some(
        (e) => e.source === source && e.target === target
      );
      if (exists) return false;

      return true;
    },
    []
  );

  return { validateWorkflow, isValidConnection };
}

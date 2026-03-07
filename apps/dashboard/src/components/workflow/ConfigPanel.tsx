"use client";
import { useState, useEffect, useRef } from "react";
import { Input, Button, Tabs } from "@/components/ui";
import { X, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

/* ─── Condition Builder ─── */

interface ConditionRule {
  field: string;
  value_type: "string" | "number" | "boolean";
  operator: string;
  value: string;
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "exists", label: "Exists" },
    { value: "not_exists", label: "Does Not Exist" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "!=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
    { value: "greater_equal", label: ">=" },
    { value: "less_equal", label: "<=" },
    { value: "exists", label: "Exists" },
  ],
  boolean: [
    { value: "equals", label: "Is" },
    { value: "not_equals", label: "Is Not" },
    { value: "exists", label: "Exists" },
  ],
};

const EMPTY_RULE: ConditionRule = { field: "", value_type: "string", operator: "equals", value: "" };

function ConditionConfig({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
  const rules: ConditionRule[] = data.rules || [
    { field: data.field || "", value_type: "string", operator: data.operator || "equals", value: data.value || "" },
  ];
  const matchMode: "all" | "any" = data.match_mode || "all";

  const setRules = (newRules: ConditionRule[]) => onUpdate({ ...data, rules: newRules, match_mode: matchMode });
  const setMatchMode = (mode: "all" | "any") => onUpdate({ ...data, rules, match_mode: mode });
  const updateRule = (i: number, updates: Partial<ConditionRule>) => {
    const updated = [...rules];
    updated[i] = { ...updated[i], ...updates };
    if (updates.value_type && updates.value_type !== rules[i].value_type) {
      updated[i].operator = "equals";
      updated[i].value = "";
    }
    setRules(updated);
  };
  const addRule = () => setRules([...rules, { ...EMPTY_RULE }]);
  const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* Match mode */}
      <div>
        <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Match Mode</label>
        <div className="flex gap-1">
          {(["all", "any"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMatchMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-150
                ${matchMode === mode
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#18181b] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)] hover:text-[#fafafa]"
                }`}
            >
              {mode === "all" ? "ALL (AND)" : "ANY (OR)"}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      {rules.map((rule, i) => (
        <div key={i} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">Rule {i + 1}</span>
            {rules.length > 1 && (
              <button onClick={() => removeRule(i)} className="text-[#71717a] hover:text-[#ef4444] transition-colors">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
          <Input id={`field-${i}`} label="Payload Field" value={rule.field} onChange={(e) => updateRule(i, { field: e.target.value })} placeholder="e.g. payload.plan" />
          <div>
            <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Value Type</label>
            <div className="flex gap-1">
              {(["string", "number", "boolean"] as const).map((vt) => (
                <button
                  key={vt}
                  onClick={() => updateRule(i, { value_type: vt })}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-colors duration-150
                    ${rule.value_type === vt
                      ? "bg-[#3b82f6] text-white"
                      : "bg-[#18181b] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)]"
                    }`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Operator</label>
            <select
              className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
              value={rule.operator}
              onChange={(e) => updateRule(i, { operator: e.target.value })}
            >
              {(OPERATORS_BY_TYPE[rule.value_type] || OPERATORS_BY_TYPE.string).map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          {rule.operator !== "exists" && rule.operator !== "not_exists" && (
            rule.value_type === "boolean" ? (
              <div>
                <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Value</label>
                <div className="flex gap-1">
                  {["true", "false"].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateRule(i, { value: v })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-150
                        ${rule.value === v
                          ? "bg-[#3b82f6] text-white"
                          : "bg-[#18181b] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)]"
                        }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Input
                id={`value-${i}`}
                label="Value"
                type={rule.value_type === "number" ? "number" : "text"}
                value={rule.value}
                onChange={(e) => updateRule(i, { value: e.target.value })}
                placeholder={rule.value_type === "number" ? "0" : "Expected value"}
              />
            )
          )}
        </div>
      ))}

      <Button variant="default" className="w-full text-xs" onClick={addRule}>
        <Plus className="w-3 h-3 mr-1" strokeWidth={2} />
        Add Condition
      </Button>
      <p className="text-[10px] text-[#71717a]">
        Fields reference the trigger payload. Use dot notation for nested fields.
      </p>
    </div>
  );
}

/* ─── Config Tab Content ─── */

function ConfigTab({ node, onUpdate }: { node: any; onUpdate: (id: string, data: any) => void }) {
  const data = node.data || {};
  const nodeType = node.type;

  const updateField = (field: string, value: any) => onUpdate(node.id, { ...data, [field]: value });
  const updateTemplate = (field: string, value: string) => {
    const template = { ...(data.template || {}), [field]: value };
    onUpdate(node.id, { ...data, template });
  };

  if (nodeType === "trigger") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-[#71717a]">
          The trigger node fires when the matching event is received via the API.
        </p>
        <Input id="event_name" label="Event Name" value={data.event_name || ""} disabled placeholder="Set on the workflow" />
      </div>
    );
  }

  if (nodeType === "channel") {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Channel</label>
          <div className="flex flex-wrap gap-1">
            {["in_app", "email", "slack", "whatsapp", "discord", "telegram"].map((ch) => (
              <button
                key={ch}
                onClick={() => updateField("channel", ch)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-150
                  ${data.channel === ch
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#18181b] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)] hover:text-[#fafafa]"
                  }`}
              >
                {ch.replace("_", "-")}
              </button>
            ))}
          </div>
        </div>

        {data.channel === "in_app" && (
          <>
            <Input id="title" label="Title" value={data.template?.title || ""} onChange={(e) => updateTemplate("title", e.target.value)} placeholder="Notification title with {{variables}}" />
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Body</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Message body with {{variables}}"
              />
            </div>
            <Input id="action_url" label="Action URL" value={data.template?.action_url || ""} onChange={(e) => updateTemplate("action_url", e.target.value)} placeholder="https://app.example.com/{{path}}" />
          </>
        )}

        {data.channel === "email" && (
          <>
            <Input id="subject" label="Subject" value={data.template?.subject || ""} onChange={(e) => updateTemplate("subject", e.target.value)} placeholder="Email subject with {{variables}}" />
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Body HTML</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm font-mono border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[120px] resize-y"
                value={data.template?.body_html || ""}
                onChange={(e) => updateTemplate("body_html", e.target.value)}
                placeholder="<p>Hello {{name}},</p>"
              />
            </div>
          </>
        )}

        {data.channel === "slack" && (
          <>
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Message</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.text || ""}
                onChange={(e) => updateTemplate("text", e.target.value)}
                placeholder="Slack message with {{variables}}"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Block Kit JSON (optional)</label>
              <textarea
                className="bg-[#0a0a0b] text-[#fafafa] text-xs font-mono border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.blocks || ""}
                onChange={(e) => updateTemplate("blocks", e.target.value)}
                placeholder='[{"type": "section", ...}]'
              />
            </div>
          </>
        )}

        {data.channel === "whatsapp" && (
          <>
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Message Body</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello {{name}}, your order {{order_id}} is ready!"
              />
            </div>
            <Input id="template_name" label="Meta Template Name (optional)" value={data.template?.template_name || ""} onChange={(e) => updateTemplate("template_name", e.target.value)} placeholder="order_confirmation" />
            <Input id="media_url" label="Media URL (optional)" value={data.template?.media_url || ""} onChange={(e) => updateTemplate("media_url", e.target.value)} placeholder="https://example.com/image.jpg" />
            {data.template?.media_url && (
              <div>
                <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Media Type</label>
                <select
                  className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  value={data.template?.media_type || "image"}
                  onChange={(e) => updateTemplate("media_type", e.target.value)}
                >
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                </select>
              </div>
            )}
          </>
        )}

        {data.channel === "discord" && (
          <>
            <Input id="title" label="Embed Title" value={data.template?.title || ""} onChange={(e) => updateTemplate("title", e.target.value)} placeholder="New notification" />
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Embed Description</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello {{name}}, your order {{order_id}} is confirmed."
              />
            </div>
            <Input id="color" label="Embed Color (hex)" value={data.template?.color || "3b82f6"} onChange={(e) => updateTemplate("color", e.target.value)} placeholder="3b82f6" />
            <Input id="footer" label="Footer (optional)" value={data.template?.footer || ""} onChange={(e) => updateTemplate("footer", e.target.value)} placeholder="Sent via alrt" />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="embed_enabled"
                checked={data.template?.embed_enabled !== false && data.template?.embed_enabled !== ""}
                onChange={(e) => updateTemplate("embed_enabled", e.target.checked ? "true" : "")}
                className="accent-[#3b82f6]"
              />
              <label htmlFor="embed_enabled" className="text-xs text-[#a1a1aa]">Use embed formatting</label>
            </div>
          </>
        )}

        {data.channel === "telegram" && (
          <>
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Message</label>
              <textarea
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello *{{name}}*, your order `{{order_id}}` is ready!"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Parse Mode</label>
              <select
                className="bg-[#111113] text-[#fafafa] text-sm border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                value={data.template?.parse_mode || "Markdown"}
                onChange={(e) => updateTemplate("parse_mode", e.target.value)}
              >
                <option value="Markdown">Markdown</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          </>
        )}

        <p className="text-[10px] text-[#71717a]">
          Use {"{{variable}}"} syntax for Jinja2 dynamic content.
        </p>
      </div>
    );
  }

  if (nodeType === "delay") {
    return (
      <div className="space-y-3">
        <Input
          id="duration"
          label="Duration (seconds)"
          type="number"
          value={data.duration_seconds || 60}
          onChange={(e) => updateField("duration_seconds", parseInt(e.target.value) || 60)}
          placeholder="60"
        />
        <div className="flex gap-1">
          {[
            { label: "30s", val: 30 },
            { label: "5m", val: 300 },
            { label: "1h", val: 3600 },
            { label: "24h", val: 86400 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => updateField("duration_seconds", preset.val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-150
                ${data.duration_seconds === preset.val
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#18181b] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)] hover:text-[#fafafa]"
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (nodeType === "condition") {
    return <ConditionConfig data={data} onUpdate={(d: any) => onUpdate(node.id, d)} />;
  }

  return null;
}

/* ─── Preview Tab ─── */

function PreviewTab({ node }: { node: any }) {
  const data = node.data || {};
  const [payload, setPayload] = useState('{\n  "name": "Alex",\n  "order_id": "ORD-123"\n}');
  const [subscriberId, setSubscriberId] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (node.type !== "channel") {
    return <p className="text-xs text-[#71717a]">Preview is only available for channel nodes.</p>;
  }

  const handlePreview = async () => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const payloadObj = payload.trim() ? JSON.parse(payload) : {};
      const templateStr = data.template?.body_html || data.template?.body || data.template?.text || data.template?.title || "";
      const res: any = await api.templates.preview({
        template: templateStr,
        payload: payloadObj,
        subscriber_id: subscriberId || undefined,
      });
      setResult(res.rendered);
    } catch (err: any) {
      setError(err.message || "Failed to render template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input id="preview-sub" label="Subscriber ID (optional)" value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)} placeholder="External ID" />
      <div>
        <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Test Payload (JSON)</label>
        <textarea
          className="bg-[#0a0a0b] text-[#fafafa] text-xs font-mono border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[80px] resize-y"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
      </div>
      <Button variant="primary" className="w-full text-xs" onClick={handlePreview} disabled={loading}>
        {loading ? "Rendering..." : "Render Template"}
      </Button>
      {error && (
        <div className="bg-[#ef4444]/10 text-[#ef4444] text-xs p-2.5 rounded-md font-mono break-all border border-[#ef4444]/20">
          {error}
        </div>
      )}
      {result && (
        <div>
          <label className="text-xs font-medium text-[#22c55e] block mb-1.5">Output</label>
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md p-3 text-sm text-[#fafafa] overflow-x-auto">
            {data.channel === "email" ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : (
              <pre className="font-mono text-xs whitespace-pre-wrap">{result}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Test Tab ─── */

function TestTab({ node }: { node: any }) {
  if (node.type !== "channel") {
    return <p className="text-xs text-[#71717a]">Test sending is only available for channel nodes.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#71717a]">
        Send a real test notification using this channel configuration. Requires a published workflow and valid provider settings.
      </p>
      <Input id="test-sub" label="Test Subscriber ID" placeholder="subscriber_external_id" />
      <div>
        <label className="text-xs font-medium text-[#a1a1aa] block mb-1.5">Test Payload (JSON)</label>
        <textarea
          className="bg-[#0a0a0b] text-[#fafafa] text-xs font-mono border border-[rgba(255,255,255,0.12)] rounded-[6px] w-full px-3 py-2 placeholder:text-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] min-h-[60px] resize-y"
          defaultValue='{"name": "Test User"}'
        />
      </div>
      <Button variant="primary" className="w-full text-xs" disabled>
        Send Test (coming soon)
      </Button>
    </div>
  );
}

/* ─── Main Panel ─── */

interface ConfigPanelProps {
  node: any;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
}

const TABS = [
  { id: "config", label: "Config" },
  { id: "preview", label: "Preview" },
  { id: "test", label: "Test" },
];

export default function ConfigPanel({ node, onUpdate, onDelete, onClose, onSave, saving }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as globalThis.Node)) {
        // Don't close if clicking on the ReactFlow canvas nodes
        const target = e.target as HTMLElement;
        if (target.closest(".react-flow__node") || target.closest(".react-flow__edge")) return;
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!node) return null;

  const nodeType = node.type;
  const nodeLabel = nodeType === "channel" ? `${node.data?.channel || "Channel"}` : nodeType;

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-4 bottom-4 w-80 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md
        flex flex-col overflow-hidden z-20 shadow-[0_0_40px_rgba(0,0,0,0.5)]
        animate-in slide-in-from-right-4 fade-in duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-sm font-medium text-[#fafafa] capitalize">
          {nodeLabel} Config
        </span>
        <button onClick={onClose} className="text-[#71717a] hover:text-[#fafafa] transition-colors">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "config" && <ConfigTab node={node} onUpdate={onUpdate} />}
        {activeTab === "preview" && <PreviewTab node={node} />}
        {activeTab === "test" && <TestTab node={node} />}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
        {onSave && (
          <Button variant="primary" className="w-full text-xs" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Workflow"}
          </Button>
        )}
        <Button variant="danger" className="w-full text-xs" onClick={() => onDelete(node.id)}>
          Remove Node
        </Button>
      </div>
    </div>
  );
}

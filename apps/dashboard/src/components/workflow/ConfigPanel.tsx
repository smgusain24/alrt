"use client";
import { useState, useEffect, useRef } from "react";
import { Input, Button, Tabs } from "@/components/ui";
import { X, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

/* --- Condition Builder --- */

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

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  fontSize: "0.75rem",
  fontWeight: 500,
  borderRadius: 6,
  transition: "all 0.15s",
  cursor: "pointer",
  border: active ? "none" : "1px solid var(--color-border)",
  background: active ? "var(--color-accent)" : "var(--color-elevated)",
  color: active ? "#fff" : "var(--color-text-secondary)",
});

const smallPillStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  fontSize: 10,
  fontFamily: "monospace",
  borderRadius: 4,
  transition: "all 0.15s",
  cursor: "pointer",
  border: active ? "none" : "1px solid var(--color-border)",
  background: active ? "var(--color-accent)" : "var(--color-elevated)",
  color: active ? "#fff" : "var(--color-text-secondary)",
});

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  display: "block",
  marginBottom: 6,
};

const textareaStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontSize: "0.875rem",
  border: "1px solid var(--color-border-bright)",
  borderRadius: 6,
  width: "100%",
  padding: "8px 12px",
  outline: "none",
  minHeight: 80,
  resize: "vertical",
  fontFamily: "inherit",
};

const monoTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  background: "var(--color-background)",
  fontSize: "0.75rem",
  fontFamily: "monospace",
};

const selectStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontSize: "0.875rem",
  border: "1px solid var(--color-border-bright)",
  borderRadius: 6,
  width: "100%",
  padding: "8px 12px",
  outline: "none",
};

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
    <div className="vstack" style={{ gap: 12 }}>
      {/* Match mode */}
      <div>
        <label style={labelStyle}>Match Mode</label>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "any"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMatchMode(mode)}
              style={pillStyle(matchMode === mode)}
            >
              {mode === "all" ? "ALL (AND)" : "ANY (OR)"}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      {rules.map((rule, i) => (
        <div key={i} style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Rule {i + 1}</span>
            {rules.length > 1 && (
              <button type="button" onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 2 }}>
                <Trash2 style={{ width: 14, height: 14 }} strokeWidth={2} />
              </button>
            )}
          </div>
          <Input id={`field-${i}`} label="Payload Field" value={rule.field} onChange={(e) => updateRule(i, { field: e.target.value })} placeholder="e.g. payload.plan" />
          <div>
            <label style={labelStyle}>Value Type</label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["string", "number", "boolean"] as const).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => updateRule(i, { value_type: vt })}
                  style={smallPillStyle(rule.value_type === vt)}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Operator</label>
            <select
              style={selectStyle}
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
                <label style={labelStyle}>Value</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["true", "false"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateRule(i, { value: v })}
                      style={pillStyle(rule.value === v)}
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

      <button className="outline small" style={{ width: "100%" }} onClick={addRule}>
        <Plus style={{ width: 12, height: 12, marginRight: 4 }} strokeWidth={2} />
        Add Condition
      </button>
      <p style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
        Fields reference the trigger payload. Use dot notation for nested fields.
      </p>
    </div>
  );
}

/* --- Config Tab Content --- */

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
      <div className="vstack" style={{ gap: 12 }}>
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          The trigger node fires when the matching event is received via the API.
        </p>
        <Input id="event_name" label="Event Name" value={data.event_name || ""} disabled placeholder="Set on the workflow" />
      </div>
    );
  }

  if (nodeType === "channel") {
    return (
      <div className="vstack" style={{ gap: 12 }}>
        <div>
          <label style={labelStyle}>Channel</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["in_app", "email", "slack", "whatsapp", "discord", "telegram"].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => updateField("channel", ch)}
                style={pillStyle(data.channel === ch)}
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
              <label style={labelStyle}>Body</label>
              <textarea
                style={textareaStyle}
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
              <label style={labelStyle}>Body HTML</label>
              <textarea
                style={{ ...monoTextareaStyle, minHeight: 120 }}
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
              <label style={labelStyle}>Message</label>
              <textarea
                style={textareaStyle}
                value={data.template?.text || ""}
                onChange={(e) => updateTemplate("text", e.target.value)}
                placeholder="Slack message with {{variables}}"
              />
            </div>
            <div>
              <label style={labelStyle}>Block Kit JSON (optional)</label>
              <textarea
                style={monoTextareaStyle}
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
              <label style={labelStyle}>Message Body</label>
              <textarea
                style={textareaStyle}
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello {{name}}, your order {{order_id}} is ready!"
              />
            </div>
            <Input id="template_name" label="Meta Template Name (optional)" value={data.template?.template_name || ""} onChange={(e) => updateTemplate("template_name", e.target.value)} placeholder="order_confirmation" />
            <Input id="media_url" label="Media URL (optional)" value={data.template?.media_url || ""} onChange={(e) => updateTemplate("media_url", e.target.value)} placeholder="https://example.com/image.jpg" />
            {data.template?.media_url && (
              <div>
                <label style={labelStyle}>Media Type</label>
                <select
                  style={selectStyle}
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
              <label style={labelStyle}>Embed Description</label>
              <textarea
                style={textareaStyle}
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello {{name}}, your order {{order_id}} is confirmed."
              />
            </div>
            <Input id="color" label="Embed Color (hex)" value={data.template?.color || "3b82f6"} onChange={(e) => updateTemplate("color", e.target.value)} placeholder="3b82f6" />
            <Input id="footer" label="Footer (optional)" value={data.template?.footer || ""} onChange={(e) => updateTemplate("footer", e.target.value)} placeholder="Sent via alrt" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                role="switch"
                id="embed_enabled"
                checked={data.template?.embed_enabled !== false && data.template?.embed_enabled !== ""}
                onChange={(e) => updateTemplate("embed_enabled", e.target.checked ? "true" : "")}
              />
              <label htmlFor="embed_enabled" style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Use embed formatting</label>
            </div>
          </>
        )}

        {data.channel === "telegram" && (
          <>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                style={textareaStyle}
                value={data.template?.body || ""}
                onChange={(e) => updateTemplate("body", e.target.value)}
                placeholder="Hello *{{name}}*, your order `{{order_id}}` is ready!"
              />
            </div>
            <div>
              <label style={labelStyle}>Parse Mode</label>
              <select
                style={selectStyle}
                value={data.template?.parse_mode || "Markdown"}
                onChange={(e) => updateTemplate("parse_mode", e.target.value)}
              >
                <option value="Markdown">Markdown</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          </>
        )}

        <p style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
          Use {"{{variable}}"} syntax for Jinja2 dynamic content.
        </p>
      </div>
    );
  }

  if (nodeType === "delay") {
    return (
      <div className="vstack" style={{ gap: 12 }}>
        <Input
          id="duration"
          label="Duration (seconds)"
          type="number"
          value={data.duration_seconds || 60}
          onChange={(e) => updateField("duration_seconds", parseInt(e.target.value) || 60)}
          placeholder="60"
        />
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "30s", val: 30 },
            { label: "5m", val: 300 },
            { label: "1h", val: 3600 },
            { label: "24h", val: 86400 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateField("duration_seconds", preset.val)}
              style={pillStyle(data.duration_seconds === preset.val)}
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

/* --- Preview Tab --- */

function PreviewTab({ node }: { node: any }) {
  const data = node.data || {};
  const [payload, setPayload] = useState('{\n  "name": "Alex",\n  "order_id": "ORD-123"\n}');
  const [subscriberId, setSubscriberId] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (node.type !== "channel") {
    return <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Preview is only available for channel nodes.</p>;
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
    <div className="vstack" style={{ gap: 12 }}>
      <Input id="preview-sub" label="Subscriber ID (optional)" value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)} placeholder="External ID" />
      <div>
        <label style={labelStyle}>Test Payload (JSON)</label>
        <textarea
          style={monoTextareaStyle}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
      </div>
      <button style={{ width: "100%", fontSize: "0.75rem" }} onClick={handlePreview} disabled={loading}>
        {loading ? "Rendering..." : "Render Template"}
      </button>
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          color: "var(--color-danger)",
          fontSize: "0.75rem",
          padding: 10,
          borderRadius: 6,
          fontFamily: "monospace",
          wordBreak: "break-all",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          {error}
        </div>
      )}
      {result && (
        <div>
          <label style={{ ...labelStyle, color: "var(--color-success)" }}>Output</label>
          <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            padding: 12,
            fontSize: "0.875rem",
            color: "var(--color-text-primary)",
            overflowX: "auto",
          }}>
            {data.channel === "email" ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : (
              <pre style={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "pre-wrap", margin: 0 }}>{result}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Test Tab --- */

function TestTab({ node }: { node: any }) {
  if (node.type !== "channel") {
    return <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Test sending is only available for channel nodes.</p>;
  }

  return (
    <div className="vstack" style={{ gap: 12 }}>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Send a real test notification using this channel configuration. Requires a published workflow and valid provider settings.
      </p>
      <Input id="test-sub" label="Test Subscriber ID" placeholder="subscriber_external_id" />
      <div>
        <label style={labelStyle}>Test Payload (JSON)</label>
        <textarea
          style={monoTextareaStyle}
          defaultValue='{"name": "Test User"}'
        />
      </div>
      <button style={{ width: "100%", fontSize: "0.75rem" }} disabled>
        Send Test (coming soon)
      </button>
    </div>
  );
}

/* --- Main Panel --- */

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
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        bottom: 16,
        width: 320,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 20,
        boxShadow: "0 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
          {nodeLabel} Config
        </span>
        <button type="button" onClick={onClose} style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: 2,
        }}>
          <X style={{ width: 16, height: 16 }} strokeWidth={2} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ padding: "8px 16px 0" }}>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {activeTab === "config" && <ConfigTab node={node} onUpdate={onUpdate} />}
        {activeTab === "preview" && <PreviewTab node={node} />}
        {activeTab === "test" && <TestTab node={node} />}
      </div>

      {/* Footer */}
      <div style={{
        padding: 12,
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {onSave && (
          <button style={{ width: "100%", fontSize: "0.75rem" }} onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Workflow"}
          </button>
        )}
        <button data-variant="danger" className="outline" style={{ width: "100%", fontSize: "0.75rem" }} onClick={() => onDelete(node.id)}>
          Remove Node
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { BeveledInput, RetroButton, GrooveDivider, Badge } from "@/components/retro";
import { X, Plus, Trash2, Eye } from "lucide-react";
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

function ConditionConfig({ data, onUpdate }: { data: any; onUpdate: (newData: any) => void }) {
  const rules: ConditionRule[] = data.rules || [{ field: data.field || "", value_type: "string", operator: data.operator || "equals", value: data.value || "" }];
  const matchMode: "all" | "any" = data.match_mode || "all";

  const setRules = (newRules: ConditionRule[]) => {
    onUpdate({ ...data, rules: newRules, match_mode: matchMode });
  };

  const setMatchMode = (mode: "all" | "any") => {
    onUpdate({ ...data, rules, match_mode: mode });
  };

  const updateRule = (index: number, updates: Partial<ConditionRule>) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], ...updates };
    // Reset operator if value_type changes
    if (updates.value_type && updates.value_type !== rules[index].value_type) {
      updated[index].operator = "equals";
      updated[index].value = "";
    }
    setRules(updated);
  };

  const addRule = () => setRules([...rules, { ...EMPTY_RULE }]);
  const removeRule = (index: number) => setRules(rules.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {/* Match mode */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide block mb-1">Match Mode</label>
        <div className="flex gap-1">
          {(["all", "any"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMatchMode(mode)}
              className={`px-3 py-1 text-xs font-heading uppercase font-bold transition-none
                ${matchMode === mode ? "bevel-inset bg-white text-accent" : "bevel-outset bg-[#c0c0c0] text-foreground"}`}
            >
              {mode === "all" ? "ALL conditions (AND)" : "ANY condition (OR)"}
            </button>
          ))}
        </div>
      </div>

      <GrooveDivider className="!my-2" />

      {/* Rules */}
      {rules.map((rule, i) => (
        <div key={i} className="bevel-inset bg-white p-2 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="default">Rule {i + 1}</Badge>
            {rules.length > 1 && (
              <button onClick={() => removeRule(i)} className="text-danger hover:text-red-700">
                <Trash2 className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Field name */}
          <BeveledInput
            id={`field-${i}`}
            label="Payload Field"
            value={rule.field}
            onChange={(e) => updateRule(i, { field: e.target.value })}
            placeholder="e.g. payload.plan, user.role"
          />

          {/* Value type */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1">Value Type</label>
            <div className="flex gap-1">
              {(["string", "number", "boolean"] as const).map((vt) => (
                <button
                  key={vt}
                  onClick={() => updateRule(i, { value_type: vt })}
                  className={`px-2 py-1 text-[10px] font-mono uppercase font-bold transition-none
                    ${rule.value_type === vt ? "bevel-inset bg-white text-accent" : "bevel-outset bg-[#c0c0c0] text-foreground"}`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>

          {/* Operator */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-1">Operator</label>
            <select
              className="bevel-inset bg-white text-foreground text-sm w-full px-2 py-1 font-body focus-retro"
              value={rule.operator}
              onChange={(e) => updateRule(i, { operator: e.target.value })}
            >
              {(OPERATORS_BY_TYPE[rule.value_type] || OPERATORS_BY_TYPE.string).map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          {/* Value input — varies by type */}
          {rule.operator !== "exists" && rule.operator !== "not_exists" && (
            <>
              {rule.value_type === "boolean" ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Value</label>
                  <div className="flex gap-1">
                    {["true", "false"].map((v) => (
                      <button
                        key={v}
                        onClick={() => updateRule(i, { value: v })}
                        className={`px-3 py-1 text-xs font-heading uppercase font-bold transition-none
                          ${rule.value === v ? "bevel-inset bg-white text-accent" : "bevel-outset bg-[#c0c0c0] text-foreground"}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <BeveledInput
                  id={`value-${i}`}
                  label="Value"
                  type={rule.value_type === "number" ? "number" : "text"}
                  value={rule.value}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                  placeholder={rule.value_type === "number" ? "0" : "Expected value"}
                />
              )}
            </>
          )}
        </div>
      ))}

      {/* Add rule button */}
      <RetroButton variant="default" className="w-full text-xs" onClick={addRule}>
        <Plus className="w-3 h-3 inline mr-1" strokeWidth={2} />
        Add Condition
      </RetroButton>

      <p className="text-[10px] text-muted">
        Fields reference the trigger payload. Use dot notation for nested fields (e.g. user.plan).
      </p>
    </div>
  );
}

interface ConfigPanelProps {
  node: any;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export default function ConfigPanel({ node, onUpdate, onDelete, onClose, onSave, saving }: ConfigPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPayload, setPreviewPayload] = useState('{\n  "name": "Alex",\n  "order_id": "ORD-123"\n}');
  const [previewSubId, setPreviewSubId] = useState("");
  const [previewResult, setPreviewResult] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  if (!node) return null;

  const data = node.data || {};
  const nodeType = node.type;

  const updateField = (field: string, value: any) => {
    onUpdate(node.id, { ...data, [field]: value });
  };

  const updateTemplate = (field: string, value: string) => {
    const template = { ...(data.template || {}), [field]: value };
    onUpdate(node.id, { ...data, template });
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewError("");
    setPreviewResult("");
    try {
      let payloadObj = {};
      if (previewPayload.trim()) {
        payloadObj = JSON.parse(previewPayload);
      }

      const templateToRender = data.template?.body_html || data.template?.body || data.template?.text || data.template?.title || "";

      const res: any = await api.templates.preview({
        template: templateToRender,
        payload: payloadObj,
        subscriber_id: previewSubId || undefined,
      });
      setPreviewResult(res.rendered);
    } catch (err: any) {
      setPreviewError(err.message || "Failed to render template.");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="w-80 bevel-outset bg-[#c0c0c0] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-title-bar px-3 py-2 flex items-center justify-between">
        <span className="font-heading text-sm text-white font-bold uppercase">
          {nodeType === "channel" ? `${data.channel || "Channel"} Config` : `${nodeType} Config`}
        </span>
        <button onClick={onClose} className="text-white hover:text-red-300">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Trigger config */}
        {nodeType === "trigger" && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              The trigger node fires when the matching event is received via the API.
            </p>
            <BeveledInput
              id="event_name"
              label="Event Name"
              value={data.event_name || ""}
              disabled
              placeholder="Set on the workflow"
            />
          </div>
        )}

        {/* Channel config */}
        {nodeType === "channel" && (
          <div className="space-y-3">
            {/* Channel type selector */}
            {!showPreview && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wide block">Channel</label>
                  <button onClick={() => setShowPreview(true)} className="flex items-center text-[10px] text-accent font-bold uppercase hover:underline">
                    <Eye className="w-3 h-3 mr-1" strokeWidth={2} /> Preview
                  </button>
                </div>
                <div className="flex gap-1">
                  {["in_app", "email", "slack"].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => updateField("channel", ch)}
                      className={`px-2 py-1 text-xs font-heading uppercase font-bold transition-none
                        ${data.channel === ch ? "bevel-inset bg-white text-accent" : "bevel-outset bg-[#c0c0c0] text-foreground"}`}
                    >
                      {ch.replace("_", "-")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showPreview && <GrooveDivider className="!my-2" />}

            {/* Template Editor Mode */}
            {!showPreview && data.channel === "in_app" && (
              <>
                <BeveledInput id="title" label="Title" value={data.template?.title || ""} onChange={(e) => updateTemplate("title", e.target.value)} placeholder="Notification title with {{variables}}" />
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Body</label>
                  <textarea
                    className="bevel-inset bg-white text-foreground text-sm w-full px-2 py-1 font-body placeholder:text-muted focus-retro min-h-[80px]"
                    value={data.template?.body || ""}
                    onChange={(e) => updateTemplate("body", e.target.value)}
                    placeholder="Message body with {{variables}}"
                  />
                </div>
                <BeveledInput id="action_url" label="Action URL" value={data.template?.action_url || ""} onChange={(e) => updateTemplate("action_url", e.target.value)} placeholder="https://app.example.com/{{path}}" />
              </>
            )}

            {/* Email template */}
            {data.channel === "email" && (
              <>
                <BeveledInput id="subject" label="Subject" value={data.template?.subject || ""} onChange={(e) => updateTemplate("subject", e.target.value)} placeholder="Email subject with {{variables}}" />
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Body HTML</label>
                  <textarea
                    className="bevel-inset bg-white text-foreground text-sm w-full px-2 py-1 font-mono placeholder:text-muted focus-retro min-h-[120px]"
                    value={data.template?.body_html || ""}
                    onChange={(e) => updateTemplate("body_html", e.target.value)}
                    placeholder="<p>Hello {{name}},</p>"
                  />
                </div>
              </>
            )}

            {/* Slack template */}
            {data.channel === "slack" && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Message</label>
                  <textarea
                    className="bevel-inset bg-white text-foreground text-sm w-full px-2 py-1 font-body placeholder:text-muted focus-retro min-h-[80px]"
                    value={data.template?.text || ""}
                    onChange={(e) => updateTemplate("text", e.target.value)}
                    placeholder="Slack message with {{variables}}"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Block Kit JSON (optional)</label>
                  <textarea
                    className="bevel-inset bg-navy text-[#00ff00] text-xs w-full px-2 py-1 font-mono placeholder:text-muted focus-retro min-h-[80px]"
                    value={data.template?.blocks || ""}
                    onChange={(e) => updateTemplate("blocks", e.target.value)}
                    placeholder='[{"type": "section", ...}]'
                  />
                </div>
              </>
            )}

            {/* Preview Mode */}
            {showPreview && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-navy text-white px-2 py-1 bevel-inset font-bold text-xs uppercase">
                  <span>Template Preview</span>
                  <button onClick={() => setShowPreview(false)} className="hover:text-danger">Close</button>
                </div>

                <BeveledInput
                  id="preview-sub-id"
                  label="Subscriber ID (Optional)"
                  value={previewSubId}
                  onChange={(e) => setPreviewSubId(e.target.value)}
                  placeholder="External ID to fetch context"
                />

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide block mb-1">Test Payload (JSON)</label>
                  <textarea
                    className="bevel-inset bg-navy text-[#00ff00] text-xs w-full px-2 py-1 font-mono placeholder:text-muted focus-retro min-h-[80px]"
                    value={previewPayload}
                    onChange={(e) => setPreviewPayload(e.target.value)}
                    placeholder='{"key": "value"}'
                  />
                </div>

                <RetroButton variant="accent" className="w-full text-xs" onClick={handlePreview} disabled={previewing}>
                  {previewing ? "Rendering..." : "Render Jinja2 Template"}
                </RetroButton>

                {previewError && (
                  <div className="bg-danger text-white text-xs p-2 font-mono break-all bevel-inset">
                    {previewError}
                  </div>
                )}

                {previewResult && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide block mb-1 text-success">Output</label>
                    <div className="bevel-inset bg-white p-2 text-sm text-foreground break-words overflow-x-auto">
                      {data.channel === "email" ? (
                        <div dangerouslySetInnerHTML={{ __html: previewResult }} />
                      ) : (
                        <pre className="font-mono text-xs whitespace-pre-wrap">{previewResult}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showPreview && (
              <p className="text-[10px] text-muted">
                Use {"{{variable}}"} syntax for Jinja2 dynamic content.
              </p>
            )}
          </div>
        )}

        {/* Delay config */}
        {nodeType === "delay" && (
          <div className="space-y-3">
            <BeveledInput
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
                  className={`px-2 py-1 text-xs font-heading uppercase font-bold
                    ${data.duration_seconds === preset.val ? "bevel-inset bg-white text-accent" : "bevel-outset bg-[#c0c0c0] text-foreground"}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Condition config */}
        {nodeType === "condition" && (
          <ConditionConfig data={data} onUpdate={(newData: any) => onUpdate(node.id, newData)} />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2 border-muted space-y-2">
        {onSave && (
          <RetroButton variant="accent" className="w-full text-xs" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Workflow"}
          </RetroButton>
        )}
        <RetroButton variant="danger" className="w-full text-xs" onClick={() => onDelete(node.id)}>
          Remove Node
        </RetroButton>
      </div>
    </div>
  );
}

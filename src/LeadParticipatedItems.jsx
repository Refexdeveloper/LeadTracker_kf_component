import { kf } from './../sdk/index.js'
import React, { useEffect, useState } from "react";
import '../index.css';

// ============================================================================
//  BOOT — timing knobs for the variable-loading sequence
// ============================================================================
const BOOT = {
  INITIAL_DELAY_MS:  1000,   // wait this long before the FIRST attempt
  RETRY_INTERVAL_MS: 2000,   // wait this long between subsequent attempts
  MAX_RETRIES:       30      // give up after this many tries (~1 minute total)
};

// ============================================================================
//  CONFIG VALIDATION
// ============================================================================
// Paths required for every config, regardless of which tabs are enabled.
const ALWAYS_REQUIRED_CONFIG_PATHS = [
  "app.processId",
  "app.appId",
  "app.popupId",
  "app.pageSize",
  "ui.enabledTabs",
  "global.alwaysHiddenColumns",
  "global.protectedColumns",
  "global.columnRenames",
  "featureFlags.showBreachFilterRow"
];

// Paths required only when the corresponding tab is in ui.enabledTabs.
// Lets a leave-management app skip the participated config block entirely.
const TAB_REQUIRED_PATHS = {
  // myItems is checked specially below — accepts either:
  //   (A) tabs.myItems.subTabs                          (new unified shape), OR
  //   (B) tabs.myItems.tabOrder AND tabs.myItems.statuses (legacy)
  myItems: [],
  myTasks: [
    "tabs.myTasks.visibleColumns",
    "tabs.myTasks.extraCustomColumns"
  ],
  participated: [
    "tabs.participated.visibleColumns",
    "tabs.participated.extraCustomColumns"
  ]
};

const getPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const validateConfig = (cfg) => {
  if (!cfg || typeof cfg !== "object") return ["<entire config object>"];

  // Step 1: always-required paths
  const missing = ALWAYS_REQUIRED_CONFIG_PATHS.filter(p => getPath(cfg, p) === undefined);

  // Step 2: validate ui.enabledTabs is a non-empty array of known tab IDs
  const enabled = cfg?.ui?.enabledTabs;
  const KNOWN_TABS = ["myItems", "myTasks", "participated"];
  if (Array.isArray(enabled)) {
    if (enabled.length === 0) {
      missing.push("ui.enabledTabs (must contain at least one tab)");
    }
    enabled.forEach(t => {
      if (!KNOWN_TABS.includes(t)) {
        missing.push(`ui.enabledTabs contains unknown tab: "${t}" (known: ${KNOWN_TABS.join(", ")})`);
      }
    });
  } else if (enabled !== undefined) {
    missing.push("ui.enabledTabs (must be an array)");
  }

  // Step 3: only require config blocks for enabled tabs
  if (Array.isArray(enabled)) {
    enabled.forEach(tabId => {
      const required = TAB_REQUIRED_PATHS[tabId] || [];
      required.forEach(p => {
        if (getPath(cfg, p) === undefined) missing.push(p);
      });
    });
  }

  // Step 4: validate myItems shape (accept subTabs OR tabOrder+statuses)
  if (Array.isArray(enabled) && enabled.includes("myItems")) {
    const myItems = cfg?.tabs?.myItems;
    const hasNew  = Array.isArray(myItems?.subTabs);
    const hasLegacy = !!(myItems?.tabOrder && myItems?.statuses);

    if (!hasNew && !hasLegacy) {
      missing.push("tabs.myItems must have either 'subTabs' (new) or 'tabOrder' + 'statuses' (legacy)");
    } else if (hasNew) {
      // Validate each subTab entry
      myItems.subTabs.forEach((t, idx) => {
        const path = `tabs.myItems.subTabs[${idx}]`;
        if (!t || typeof t !== "object") {
          missing.push(`${path} must be an object`);
          return;
        }
        if (!t.filter)                       missing.push(`${path}.filter`);
        if (!Array.isArray(t.visibleColumns)) missing.push(`${path}.visibleColumns`);
        if (t.kind && t.kind !== "status" && t.kind !== "step") {
          missing.push(`${path}.kind must be "status" or "step" (got "${t.kind}")`);
        }
      });
    } else if (hasLegacy) {
      myItems.tabOrder.forEach(statusName => {
        const statusCfg = myItems.statuses[statusName];
        if (!statusCfg || !Array.isArray(statusCfg.visibleColumns)) {
          missing.push(`tabs.myItems.statuses.${statusName}.visibleColumns`);
        }
      });
    }
  }

  return missing.length > 0 ? missing : null;
};

// ============================================================================
//  attemptLoadConfig() — ONE attempt to read + parse + validate
//  ----------------------------------------------------------------------------
//  Returns one of:
//    { status: "ok",       config }
//    { status: "retry",    devReason }   ← transient, caller may try again
//    { status: "fatal",    devReason, missing? }   ← permanent, give up
// ============================================================================
const attemptLoadConfig = async () => {
  let raw;
  try {
    raw = await kf.app.getVariable("KF_LANDING_CONFIG");
  } catch (e) {
    console.warn("⏳ [LANDING] kf.app.getVariable threw — will retry:", e);
    return { status: "retry", devReason: "kf.app.getVariable threw an exception" };
  }

  if (!raw) {
    console.warn("⏳ [LANDING] KF_LANDING_CONFIG empty/undefined — will retry");
    return { status: "retry", devReason: "Variable empty or undefined" };
  }

  // Got something. From here on, parse/validation errors are FATAL — they
  // won't fix themselves by waiting longer.
  let parsed;
  try {
    parsed = (typeof raw === "string") ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error("❌ [LANDING] KF_LANDING_CONFIG is not valid JSON:", e);
    return { status: "fatal", devReason: "Variable is not valid JSON" };
  }

  const missing = validateConfig(parsed);
  if (missing) {
    console.error("❌ [LANDING] KF_LANDING_CONFIG missing required fields:", missing);
    return { status: "fatal", devReason: "Variable is missing required fields", missing };
  }

  console.log("✅ [LANDING] KF_LANDING_CONFIG loaded and validated");
  return { status: "ok", config: parsed };
};

// Helper that resolves after `ms` milliseconds.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
//  HELPERS
// ============================================================================
const log = (...args) => console.log("🟣 [LANDING]", ...args);

const requireParams = (label, params) => {
  const missing = Object.entries(params)
    .filter(([_, v]) => v === undefined || v === null || v === "")
    .map(([k]) => k);

  if (missing.length > 0) {
    console.warn(`⏸️ [LANDING] [${label}] SKIPPED — waiting for: ${missing.join(", ")}`);
    return false;
  }
  return true;
};

const safeApi = async (url, label, options = {}, silent = false) => {
  if (!silent) log(`🌐 API HIT [${label}]`, url);
  if (!silent && Object.keys(options).length > 0) log(`📦 PAYLOAD [${label}]`, options.body);

  if (!url || url.includes("undefined") || url.includes("null")) {
    if (!silent) console.warn(`❌ [${label}] Blocked URL — contains undefined/null:`, url);
    return null;
  }

  try {
    const res = await kf.api(url, options);
    if (!silent) log(`✅ [${label}] response received`);
    return res;
  } catch (e) {
    if (!silent) console.error(`❌ [${label}] API ERROR:`, e);
    return null;
  }
};

const toText = (v) => {
  if (!v) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return v?.Name || v?.name || JSON.stringify(v);
};

const SLA_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "16 Jul 2026, 11:27:25 AM" */
const formatSlaDeadlineDate = (ms) => {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  return `${d.getDate()} ${SLA_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

/** Compact duration with only the required units: "45m", "12h", "2d 6h". */
const formatSlaDuration = (ms) => {
  const totalSecs = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
};

/** 🟢 >24h · 🟡 <24h · 🟠 <1h · 🔴 breached ("+" prefixed overdue duration). */
const slaBadgeMeta = (diffMs) => {
  if (diffMs <= 0) {
    return { icon: '🔴', label: `+${formatSlaDuration(-diffMs)}`, bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  }
  if (diffMs < 60 * 60 * 1000) {
    return { icon: '🟠', label: `${formatSlaDuration(diffMs)} left`, bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    return { icon: '🟡', label: `${formatSlaDuration(diffMs)} left`, bg: '#fef9c3', color: '#a16207', border: '#fde047' };
  }
  return { icon: '🟢', label: `${formatSlaDuration(diffMs)} left`, bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
};

/**
 * parseDeadlineValue — accepts whatever Kissflow returns for a deadline field
 * and tries to produce an epoch-ms number.
 *
 * Handles:
 *   1. ISO strings:          "2026-04-29T07:16:00Z"
 *   2. Numbers (epoch ms):   1745934600000
 *   3. Wrapped objects:      { Value: "2026-04-29T..." } or { _id: ..., Value: ... }
 *   4. Locale display strings that Date.parse can handle:
 *                            "Apr 29, 2026, 12:48 PM"
 *   5. dd-MMM-yyyy hh:mm AM/PM custom formats:
 *                            "29-Apr-2026 12:48 PM"
 *   6. dd/MM/yyyy or dd-MM-yyyy custom formats:
 *                            "29/04/2026 12:48"  /  "29-04-2026 12:48"
 *
 * Returns NaN if it cannot parse — caller should treat as "no timer".
 */
const parseDeadlineValue = (val) => {
  if (val == null || val === "") return NaN;

  // Case 2: already a number (epoch ms)
  if (typeof val === "number") return isFinite(val) ? val : NaN;

  // Case 3: wrapped object — try common shapes
  if (typeof val === "object" && !Array.isArray(val)) {
    const inner = val.Value ?? val.value ?? val.iso ?? val.timestamp ?? val.dateTime;
    if (inner != null) return parseDeadlineValue(inner);    // recurse on inner
    return NaN;
  }

  if (typeof val !== "string") return NaN;

  // Case 1 & 4: try the native Date parser first (handles ISO + many locale strings)
  const native = Date.parse(val);
  if (!isNaN(native)) return native;

  // Case 5: dd-MMM-yyyy hh:mm AM/PM  e.g. "29-Apr-2026 12:48 PM"
  const m1 = val.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (m1) {
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const [, dd, mon, yyyy, hh, mm, ampm] = m1;
    const monIdx = months[mon.toLowerCase()];
    if (monIdx == null) return NaN;
    let h = parseInt(hh, 10);
    if (/pm/i.test(ampm) && h !== 12) h += 12;
    if (/am/i.test(ampm) && h === 12) h = 0;
    const d = new Date(parseInt(yyyy, 10), monIdx, parseInt(dd, 10), h, parseInt(mm, 10), 0);
    return d.getTime();
  }

  // Case 6: dd/MM/yyyy hh:mm  or dd-MM-yyyy hh:mm
  const m2 = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (m2) {
    const [, dd, mm, yyyy, hh, min, ampm] = m2;
    let h = parseInt(hh, 10);
    if (ampm && /pm/i.test(ampm) && h !== 12) h += 12;
    if (ampm && /am/i.test(ampm) && h === 12) h = 0;
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), h, parseInt(min, 10), 0);
    return d.getTime();
  }

  return NaN;
};

const deriveDisplayColumns = (rawCols, visibleColumnIds, alwaysHidden, protectedCols) => {
  const colsById = new Map((rawCols || []).map(c => [c.Id, c]));
  return visibleColumnIds
    .map(id => colsById.get(id))
    .filter(Boolean)
    .filter(c => !alwaysHidden.includes(c.Id) || protectedCols.includes(c.Id));
};

const buildPayload = (visibleColumnIds, processId) =>
  visibleColumnIds.map(id => ({ Id: id, Model: processId }));

/**
 * Component-level SLA defaults — used only when the config provides nothing.
 * These match the existing CSS classes so old configs keep working.
 */
const SLA_BUILTIN_DEFAULTS = {
  sourceField:        "Deadline",
  warningThresholdMs: 30000,
  // Hex colors. If null/undefined, the row falls back to the CSS classes
  // .row-warning / .row-breached defined in index.css.
  warningRowBg:       null,
  warningTextColor:   null,
  breachedRowBg:      null,
  breachedTextColor:  null
};

/**
 * resolveSlaSpec — figures out the SLA settings to apply to a single row.
 *
 * Resolution order (later sources override earlier ones):
 *   1. SLA_BUILTIN_DEFAULTS                                   (lowest priority)
 *   2. The kf_custom_timer column spec inside extraCustomColumns
 *      (so users who set sourceField/warningThresholdMs there get respected)
 *   3. tabCfg.sla.defaults
 *   4. tabCfg.sla.perStep[stepName]                           (highest priority)
 *
 * Source-field precedence specifically: the timer column's sourceField wins
 * over the built-in default. This way an app with field "SLA_Deadline" works
 * by setting sourceField in the timer column spec, even without an "sla" block.
 *
 * @param {object} tabCfg   - the tab's config block (e.g. config.tabs.myTasks)
 * @param {string} stepName - the row's workflow step name (used for perStep lookup)
 * @returns {object} merged spec with sourceField, warningThresholdMs, and colors
 */
const resolveSlaSpec = (tabCfg, stepName) => {
  // Pull anything the user put on the kf_custom_timer column itself.
  // This is where backwards-compatible configs put sourceField + warningThresholdMs
  // before the richer "sla" block existed.
  const timerCol = (tabCfg?.extraCustomColumns || []).find(c => c?.Id === "kf_custom_timer") || {};
  const timerColDefaults = {};
  if (timerCol.sourceField        !== undefined) timerColDefaults.sourceField        = timerCol.sourceField;
  if (timerCol.warningThresholdMs !== undefined) timerColDefaults.warningThresholdMs = timerCol.warningThresholdMs;

  const tabDefaults  = tabCfg?.sla?.defaults    || {};
  const stepOverride = tabCfg?.sla?.perStep?.[stepName] || {};
  return {
    ...SLA_BUILTIN_DEFAULTS,
    ...timerColDefaults,    // ← timer column spec layered above built-ins
    ...tabDefaults,
    ...stepOverride
  };
};

/**
 * tabHasTimer — does this tab declare a kf_custom_timer column?
 * Used by the renderer to decide whether to compute SLA at all.
 */
const tabHasTimer = (extraCustomColumns) =>
  Array.isArray(extraCustomColumns) &&
  extraCustomColumns.some(c => c?.Id === "kf_custom_timer");

// ============================================================================
//  TIMER DIAGNOSTICS
//  ----------------------------------------------------------------------------
//  When a timer cell shows "—" instead of a countdown, ONE of four things is
//  going wrong. This helper logs which one — but only once per row, otherwise
//  the per-second re-render would flood the console.
// ============================================================================
const TIMER_DIAG_SEEN = new Set();   // row IDs we've already explained

const diagTimer = (rowId, status, details) => {
  // De-dupe by row+status so the same problem doesn't log every second.
  const key = `${rowId}::${status}`;
  if (TIMER_DIAG_SEEN.has(key)) return;
  TIMER_DIAG_SEEN.add(key);

  const icons = { ok: "✅", missingTab: "🚫", missingField: "🔍", unparseable: "⚠️" };
  console.log(`${icons[status] || "•"} [TIMER ${status.toUpperCase()}] row=${rowId}`, details);
};

// Reset diagnostics when the user navigates between tabs/steps so the next
// view gets a fresh look at any new issues.
const resetTimerDiag = () => TIMER_DIAG_SEEN.clear();

// ============================================================================
//  TAB_REGISTRY
//  ----------------------------------------------------------------------------
//  Maps internal tab IDs (used in config) to default display labels.
//  Users can override the display label via config.ui.tabLabels[<id>].
//
//  Adding a brand-new tab kind would require a new entry here AND new fetch
//  functions wired into the component — it's structural, not pure config.
// ============================================================================
const TAB_REGISTRY = {
  myItems:      { defaultLabel: "My Items"     },
  myTasks:      { defaultLabel: "My Tasks"     },
  participated: { defaultLabel: "Participated" }
};

// Resolve display label for a tab ID, honouring user override.
const labelForTab = (tabId, config) =>
  config?.ui?.tabLabels?.[tabId] || TAB_REGISTRY[tabId]?.defaultLabel || tabId;

// Reverse: given a display label, find its internal tab ID.
// Used to migrate localStorage values (which historically stored the label).
const tabIdFromLabel = (label, config) => {
  for (const id of Object.keys(TAB_REGISTRY)) {
    if (labelForTab(id, config) === label) return id;
  }
  return null;
};

// Build the per-app localStorage key prefix so multi-app browsers don't collide.
const lsKey = (appId, suffix) => `kf_${appId || "default"}_${suffix}`;

// ============================================================================
//  MY ITEMS SUB-TAB RESOLVER
//  ----------------------------------------------------------------------------
//  Two supported config shapes inside tabs.myItems:
//
//    (A) NEW unified shape — preferred, supports step-based filtering:
//        "subTabs": [
//          { "id": "draft",     "kind": "status", "filter": "Draft",     "label": "Draft",      "visibleColumns": [...] },
//          { "id": "booked",    "kind": "step",   "filter": "Booked",    "label": "Booked",     "visibleColumns": [...] },
//          { "id": "completed", "kind": "status", "filter": "Completed", "label": "Completed",  "visibleColumns": [...] }
//        ]
//
//    (B) OLD shape (still supported for back-compat):
//        "tabOrder": ["Draft", "InProgress", "Completed", "Withdrawn", "Rejected"],
//        "statuses": { "Draft": { "visibleColumns": [...] }, ... }
//
//  This helper returns the unified shape regardless of which one is in config.
//  Callers downstream only know about subTabs.
//
//  EACH SUBTAB OBJECT FIELDS:
//    id              - unique slug used for state/localStorage (e.g. "draft", "booked")
//    kind            - "status" or "step"
//    filter          - status name (for kind=status) or step name (for kind=step)
//    label           - display label shown to user
//    visibleColumns  - column IDs (same as before)
// ============================================================================
const resolveMyItemsSubTabs = (myItemsCfg) => {
  if (!myItemsCfg) return [];

  // Shape (A): explicit subTabs array
  if (Array.isArray(myItemsCfg.subTabs)) {
    return myItemsCfg.subTabs.map(t => ({
      id:             t.id || (t.label || t.filter || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      kind:           t.kind === "step" ? "step" : "status",
      filter:         t.filter,
      label:          t.label || t.filter,
      visibleColumns: t.visibleColumns || []
    }));
  }

  // Shape (B): legacy tabOrder + statuses
  const order = myItemsCfg.tabOrder || [];
  return order.map(statusName => {
    const statusCfg = myItemsCfg.statuses?.[statusName] || {};
    return {
      id:             statusName.toLowerCase(),
      kind:           "status",
      filter:         statusName,
      label:          statusName,
      visibleColumns: statusCfg.visibleColumns || []
    };
  });
};

// ============================================================================
//  ASSIGNEE CELL
// ============================================================================
const parseAssignees = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) { return [{ Name: val }]; }
  }
  if (typeof val === 'object') return [val];
  return [];
};

const AssigneeCell = ({ value }) => {
  const assignees = parseAssignees(value);
  if (!assignees || assignees.length === 0) return <span style={{color: '#cbd5e1'}}>—</span>;

  if (assignees.length === 1) {
    const u = assignees[0];
    const name = u.Name || u.name || (typeof u === 'string' ? u : "Unknown");
    const initial = name.charAt(0).toUpperCase();
    const isRole = u.kind === 'role' || u.Type === 'Role' || u.Type === 'role';
    return (
      <div className="kf-assignee-pill">
        <div className={`kf-avatar-circle ${isRole ? 'kf-avatar-role' : 'kf-avatar-user'}`}>
          {isRole ? '💼' : initial}
        </div>
        <span className="kf-assignee-name">{name}</span>
      </div>
    );
  }

  return (
    <div className="kf-assignee-group">
      {assignees.map((u, i) => {
        const name = u.Name || u.name || (typeof u === 'string' ? u : "Unknown");
        const initial = name.charAt(0).toUpperCase();
        const isRole = u.kind === 'role' || u.Type === 'Role' || u.Type === 'role';
        return (
          <div
            key={i}
            className={`kf-avatar-circle stacked ${isRole ? 'kf-avatar-role' : 'kf-avatar-user'}`}
            title={name}
            style={{ zIndex: assignees.length - i }}
          >
            {isRole ? '💼' : initial}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
//  WAITING SCREEN — shown during initial delay + retry loop
// ============================================================================
const WaitingScreen = ({ attempt, maxAttempts }) => (
  <div id="root">
    <div
      className="empty-state"
      style={{
        height: '70vh',
        textAlign: 'center',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 16 }} className="bounce-icon">⏳</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, color: '#334155' }}>
        Just a moment…
      </div>
      <div style={{ fontWeight: 500, fontSize: 14, color: '#64748b', maxWidth: 420, lineHeight: 1.6 }}>
        Please wait while we set things up for you.
      </div>
      {attempt > 1 && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          Still loading… (attempt {attempt} of {maxAttempts})
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
//  CONFIG ERROR SCREEN — shown only on FATAL config errors (parse/validation)
//  Displays the actual reason and missing fields so you can debug without
//  needing to dig through the browser console.
// ============================================================================
const ConfigErrorScreen = ({ reason, missing }) => (
  <div id="root">
    <div
      className="empty-state"
      style={{
        minHeight: '70vh',
        textAlign: 'center',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🛠️</div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 12, color: '#334155' }}>
        Something's not quite right
      </div>
      <div style={{ fontWeight: 500, fontSize: 15, color: '#64748b', maxWidth: 480, lineHeight: 1.6, marginBottom: 16 }}>
        We couldn't load this page right now.
      </div>

      {reason && (
        <div style={{
          maxWidth: 600,
          textAlign: 'left',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: 8,
          padding: 16,
          marginTop: 8,
          marginBottom: 16,
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#7c2d12'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Reason:</div>
          <div style={{ marginBottom: missing && missing.length > 0 ? 12 : 0 }}>
            {reason}
          </div>
          {missing && missing.length > 0 && (
            <>
              <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>
                Missing or invalid fields ({missing.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {missing.map((m, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div style={{ fontWeight: 500, fontSize: 14, color: '#64748b', maxWidth: 520, lineHeight: 1.5 }}>
        Please contact your <strong style={{ color: '#7c3aed' }}>support team</strong> for help, or share the details above.
      </div>
    </div>
  </div>
);

// ============================================================================
//  MAIN COMPONENT
// ============================================================================
export function DefaultLandingComponent() {
  const accountId = kf?.account?._id;

  // Boot phases:
  //   "waiting"   → initial delay or retry in progress
  //   "ready"     → config loaded, normal app
  //   "fatal"     → unrecoverable config error, show support screen
  //   "exhausted" → max retries hit without success, show support screen
  const [bootPhase, setBootPhase]         = useState("waiting");
  const [config, setConfig]               = useState(null);
  const [bootAttempt, setBootAttempt]     = useState(0);
  const [fatalDetails, setFatalDetails]   = useState({ reason: "", missing: [] });

  const savedParent    = localStorage.getItem('kf_parentTab')       || "My Items";
  const savedChild     = localStorage.getItem('kf_childTab')        || "Draft";
  const savedTaskStep  = localStorage.getItem('kf_activeTaskStep')  || null;
  const savedPartStep  = localStorage.getItem('kf_activePartStep')  || null;

  const [parentTab, setParentTab]         = useState(savedParent);
  const [childTab, setChildTab]           = useState(savedChild);
  const [activeTaskId, setActiveTaskId]   = useState(null);
  const [activePartId, setActivePartId]   = useState(null);

  // Derived: the internal ID for the current parent tab. Use THIS, not
  // parentTab (the display label), in any comparisons or config lookups.
  // It's resolved against the loaded config so user-customised tabLabels work.
  const parentTabId = config ? tabIdFromLabel(parentTab, config) : null;

  const [breachFilter, setBreachFilter]   = useState("All");
  const [searchQuery, setSearchQuery]     = useState("");

  const [loading, setLoading]             = useState(true);
  const [columns, setColumns]             = useState([]);
  const [rows, setRows]                   = useState([]);
  const [steps, setSteps]                 = useState([]);
  const [page, setPage]                   = useState(1);
  const [totalItemsCount, setTotalItemsCount] = useState(0);

  const [myItemsCounts, setMyItemsCounts] = useState({});
  // Per-step counts for "kind: step" sub-tabs in My Items. Computed by fetching
  // the InProgress list once and grouping by _current_step. Sentinel value
  // "100+" means the count hit our scan limit and is approximate.
  const [myItemsStepCounts, setMyItemsStepCounts] = useState({});

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================================================
  //  EFFECT — boot sequence: initial delay → retry loop until success/fatal
  // ==========================================================================
  useEffect(() => {
    let cancelled = false;

    const runBoot = async () => {
      log(`🚀 Component mounted — initial delay ${BOOT.INITIAL_DELAY_MS}ms before first variable read`);
      await sleep(BOOT.INITIAL_DELAY_MS);
      if (cancelled) return;

      for (let attempt = 1; attempt <= BOOT.MAX_RETRIES; attempt++) {
        if (cancelled) return;

        setBootAttempt(attempt);
        log(`🔁 [LANDING] boot attempt ${attempt}/${BOOT.MAX_RETRIES}`);

        const result = await attemptLoadConfig();
        if (cancelled) return;

        if (result.status === "ok") {
          log("📦 Config received and validated");
          setConfig(result.config);
          setBootPhase("ready");
          return;
        }

        if (result.status === "fatal") {
          console.error(`🛑 [LANDING] Fatal config error — ${result.devReason}`, result.missing || "");
          setFatalDetails({
            reason:  result.devReason || "Unknown error",
            missing: result.missing || []
          });
          setBootPhase("fatal");
          return;
        }

        // status === "retry" — wait and try again
        if (attempt < BOOT.MAX_RETRIES) {
          await sleep(BOOT.RETRY_INTERVAL_MS);
        }
      }

      // Loop exited without ok/fatal — we ran out of attempts
      console.error(`🛑 [LANDING] Gave up after ${BOOT.MAX_RETRIES} attempts — variable never appeared`);
      setBootPhase("exhausted");
    };

    runBoot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem('kf_parentTab', parentTab);
    localStorage.setItem('kf_childTab',  childTab);
  }, [parentTab, childTab]);

  // ----- Initial fetch (waits for config + accountId) -----------------------
  useEffect(() => {
    if (bootPhase !== "ready" || !config) {
      log("⏸️ Initial fetch waiting — boot not ready");
      return;
    }
    if (!accountId) {
      log("⏸️ Initial fetch waiting — accountId not available yet");
      return;
    }

    // Resolve which tab to land on:
    //   • If the saved parent tab (a display label) maps to an enabled tab → use it.
    //   • Otherwise → fall back to the first enabled tab.
    const enabled = config.ui.enabledTabs || ["myItems", "myTasks", "participated"];
    const savedTabId = tabIdFromLabel(savedParent, config);
    let initialTabId = savedTabId && enabled.includes(savedTabId) ? savedTabId : enabled[0];

    if (savedTabId && !enabled.includes(savedTabId)) {
      log(`🚫 Saved tab "${savedParent}" is disabled in config — falling back to "${labelForTab(initialTabId, config)}"`);
    }

    const initialTabLabel = labelForTab(initialTabId, config);
    setParentTab(initialTabLabel);
    log(`🚀 Both config + accountId ready → restoring parentTab=${initialTabLabel}`);

    if (initialTabId === "myItems") {
      // Resolve savedChild against the new sub-tabs. savedChild may be:
      //   - a sub-tab id ("draft", "booked")
      //   - a legacy status name ("Draft", "Completed") — match case-insensitively
      //   - missing/stale — fall back to the first sub-tab
      const subTabs = resolveMyItemsSubTabs(config?.tabs?.myItems);
      let initialSubTabId = subTabs[0]?.id;
      if (savedChild && subTabs.length > 0) {
        const match = subTabs.find(t =>
          t.id === savedChild ||
          t.id === savedChild.toLowerCase() ||
          t.filter === savedChild
        );
        if (match) initialSubTabId = match.id;
      }
      if (initialSubTabId && initialSubTabId !== childTab) {
        setChildTab(initialSubTabId);
      }
      fetchAllMyItemsCounts();
      fetchMyItemsStepCounts();
      if (initialSubTabId) fetchMyItems(initialSubTabId, 1);
    } else if (initialTabId === "myTasks") {
      fetchMyTasksSteps();
    } else if (initialTabId === "participated") {
      fetchParticipatedSteps();
    }
  }, [bootPhase, config, accountId]);

  useEffect(() => {
    const handleFocus = () => {
      if (bootPhase !== "ready" || !config || !accountId) {
        log("👀 Window focused but app not ready — skipping refresh");
        return;
      }
      log("👀 Window focused — re-fetching current view");
      if (parentTabId === "myItems")                     fetchMyItems(childTab, page);
      if (parentTabId === "myTasks"     && activeTaskId) fetchTaskData(activeTaskId, page);
      if (parentTabId === "participated" && activePartId) fetchParticipatedData(activePartId, page);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [bootPhase, config, parentTab, childTab, activeTaskId, activePartId, page, accountId]);

  // ==========================================================================
  //  MY ITEMS — counts
  // ==========================================================================
  const fetchAllMyItemsCounts = async () => {
    const processId = config?.app?.processId;
    const appId     = config?.app?.appId;
    if (!requireParams("fetchAllMyItemsCounts", { accountId, processId, appId })) return;

    const url = `/process/2/${accountId}/${processId}/myitems/status/count?_application_id=${appId}`;
    const res = await safeApi(url, "MY ITEMS - STATUS COUNT", {}, true);

    if (res) {
      log("📊 My Items counts received:", res);
      setMyItemsCounts({
        Draft:      res.Draft      || 0,
        InProgress: res.InProgress || 0,
        Completed:  res.Completed  || 0,
        Withdrawn:  res.Withdrawn  || 0,
        Rejected:   res.Rejected   || 0
      });
    }
  };

  // ==========================================================================
  //  MY ITEMS — step counts (for kind: "step" sub-tabs)
  //  --------------------------------------------------------------------------
  //  Kissflow has no per-step count API for "my items", so we fetch up to
  //  100 InProgress rows and bucket them by _current_step in the browser.
  //
  //  Cost: ONE extra HTTP call per My Items session, only fired if the
  //  config actually declares step sub-tabs. Apps with only status sub-tabs
  //  pay nothing.
  //
  //  Accuracy: exact when InProgress total ≤ 100. Above that, the count
  //  shown is "100+" — honest about being approximate.
  // ==========================================================================
  const STEP_COUNT_SCAN_LIMIT = 100;

  const fetchMyItemsStepCounts = async () => {
    const processId = config?.app?.processId;
    const appId     = config?.app?.appId;
    if (!requireParams("fetchMyItemsStepCounts", { accountId, processId, appId })) return;

    // Only do the work if config actually has step sub-tabs to count.
    const subTabs = resolveMyItemsSubTabs(config?.tabs?.myItems);
    const stepSubTabs = subTabs.filter(t => t.kind === "step");
    if (stepSubTabs.length === 0) {
      log("📊 No step sub-tabs configured — skipping step count scan");
      return;
    }

    log(`📊 Scanning up to ${STEP_COUNT_SCAN_LIMIT} InProgress rows to count steps:`,
        stepSubTabs.map(t => t.filter));

    const dataUrl = `/process/2/${accountId}/${processId}/myitems/InProgress?page_number=1&page_size=${STEP_COUNT_SCAN_LIMIT}`;
    const res = await safeApi(dataUrl, "MY ITEMS - STEP COUNT SCAN");

    if (!res || !Array.isArray(res.Data)) return;

    const rows = res.Data;
    const hitLimit = rows.length >= STEP_COUNT_SCAN_LIMIT;

    // Bucket rows by step name. Step value may be a string or { Name: "..." }.
    const counts = {};
    stepSubTabs.forEach(t => { counts[t.filter] = 0; });
    rows.forEach(r => {
      const stepName = typeof r._current_step === "string"
        ? r._current_step
        : (r._current_step?.Name || r._current_step?.name || "");
      if (counts[stepName] !== undefined) counts[stepName] += 1;
    });

    // If we hit the scan limit AND a step's count equals the limit, the
    // true count could be larger. Mark those as "100+".
    const final = {};
    Object.entries(counts).forEach(([stepName, n]) => {
      final[stepName] = (hitLimit && n === STEP_COUNT_SCAN_LIMIT) ? `${STEP_COUNT_SCAN_LIMIT}+` : n;
    });

    log("📊 Step counts:", final, hitLimit ? "(scan limit reached)" : "(exact)");
    setMyItemsStepCounts(final);
  };

  // ==========================================================================
  //  MY ITEMS — list (per sub-tab — supports both status and step filtering)
  //  --------------------------------------------------------------------------
  //  subTabId is the unique id of the sub-tab (e.g. "draft", "booked").
  //  We look up the full sub-tab object via resolveMyItemsSubTabs() to
  //  determine whether to filter by status or by current step.
  // ==========================================================================
  const fetchMyItems = async (subTabId, pageNumber = 1) => {
    log(`▶️ fetchMyItems(subTabId=${subTabId}, page=${pageNumber})`);

    const processId = config?.app?.processId;
    const appId     = config?.app?.appId;
    const pageSize  = config?.app?.pageSize;

    if (!requireParams("fetchMyItems", { accountId, processId, appId, pageSize, subTabId })) return;

    // Find the sub-tab definition
    const subTabs = resolveMyItemsSubTabs(config?.tabs?.myItems);
    const subTab  = subTabs.find(t => t.id === subTabId);
    if (!subTab) {
      console.warn(`⚠️ [fetchMyItems] No sub-tab found with id="${subTabId}" — skipping`);
      return;
    }

    setLoading(true);
    if (pageNumber === 1) setColumns([]);
    setRows([]);

    const visibleCols   = subTab.visibleColumns;
    const protectedCols = config.global.protectedColumns;
    const alwaysHidden  = config.global.alwaysHiddenColumns;
    const payload       = buildPayload(visibleCols, processId);

    log(`🟢 [MY ITEMS] sub-tab "${subTab.label}" — kind=${subTab.kind}, filter=${subTab.filter}`);
    log("🟢 [MY ITEMS] visible columns:", visibleCols);

    // ---- The status used for the API call. ----
    // For status sub-tabs, use the configured status directly.
    // For step sub-tabs, hit InProgress (records in flight) and filter
    // client-side by _current_step matching the step name.
    const apiStatus = subTab.kind === "step" ? "InProgress" : subTab.filter;

    if (pageNumber === 1) {
      const prefUrl = `/common/2/${accountId}/preference/${processId}/WorkflowStep/${apiStatus}/?_application_id=${appId}`;
      await safeApi(prefUrl, `MY ITEMS - POST PREF (${apiStatus})`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AppId:      processId,
          ConfigJson: { Columns: payload, Filter: {}, Sort: [] },
          ViewId:     apiStatus,
          ViewType:   "WorkflowStep"
        })
      });
    }

    const dataUrl = `/process/2/${accountId}/${processId}/myitems/${apiStatus}?page_number=${pageNumber}&page_size=${pageSize}&apply_preference=true`;
    const res = await safeApi(dataUrl, `MY ITEMS - GET DATA (${apiStatus})`);

    if (res) {
      const finalCols = deriveDisplayColumns(res.Columns || [], visibleCols, alwaysHidden, protectedCols);
      log("🟢 [MY ITEMS] final display columns:", finalCols.map(c => c.Id));

      let dataRows = res.Data || [];

      // For step sub-tabs, filter client-side by _current_step
      if (subTab.kind === "step") {
        const beforeCount = dataRows.length;
        dataRows = dataRows.filter(r => {
          const currentStep = r._current_step;
          // Step value in the row may be a string OR an object like { Name: "Booked" }
          const stepName = typeof currentStep === "string"
            ? currentStep
            : (currentStep?.Name || currentStep?.name || "");
          return stepName === subTab.filter;
        });
        log(`🔍 [MY ITEMS] step filter "${subTab.filter}" — kept ${dataRows.length} of ${beforeCount} rows`);
      }

      setColumns(finalCols);
      setRows(dataRows);

      // Total count: for status tabs use Aggregation; for step tabs use the filtered length
      // (the server's Aggregation count won't reflect our client-side filter).
      if (subTab.kind === "step") {
        setTotalItemsCount(dataRows.length);
      } else if (res.Aggregation && Object.keys(res.Aggregation).length > 0) {
        setTotalItemsCount(Object.values(res.Aggregation)[0].Count || 0);
      } else {
        setTotalItemsCount(res.Data?.length || 0);
      }
    }
    setLoading(false);
  };

  // ==========================================================================
  //  MY TASKS — pending step counts
  // ==========================================================================
  const fetchMyTasksSteps = async () => {
    log("▶️ fetchMyTasksSteps()");

    const processId = config?.app?.processId;
    if (!requireParams("fetchMyTasksSteps", { accountId, processId })) return;

    setLoading(true);
    setRows([]);
    setColumns([]);
    resetTimerDiag();

    const countUrl = `/process/2/${accountId}/${processId}/pending/activity/count`;
    const stepsData = await safeApi(countUrl, "MY TASKS - GET STEP COUNTS");

    if (stepsData && Array.isArray(stepsData)) {
      log("📊 My Tasks steps:", stepsData);
      setSteps(stepsData);
      if (stepsData.length > 0) {
        const stepToLoad = stepsData.find(s => s.StepName === savedTaskStep) || stepsData[0];
        setActiveTaskId(stepToLoad._id);
        fetchTaskData(stepToLoad._id, 1);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  // ==========================================================================
  //  MY TASKS — rows for a step
  // ==========================================================================
  const fetchTaskData = async (activityId, pageNumber = 1) => {
    log(`▶️ fetchTaskData(activityId=${activityId}, page=${pageNumber})`);

    const processId = config?.app?.processId;
    const appId     = config?.app?.appId;
    const pageSize  = config?.app?.pageSize;

    if (!requireParams("fetchTaskData", { accountId, processId, appId, pageSize, activityId })) return;

    setLoading(true);
    setRows([]);
    if (pageNumber === 1) setColumns([]);
    resetTimerDiag();

    const myTasksCfg    = config.tabs.myTasks;
    const visibleCols   = myTasksCfg.visibleColumns;
    const extraCols     = myTasksCfg.extraCustomColumns || [];
    const protectedCols = config.global.protectedColumns;
    const alwaysHidden  = config.global.alwaysHiddenColumns;
    const payload       = buildPayload(visibleCols, processId);

    log("🟢 [MY TASKS] visible columns:", visibleCols);

    if (pageNumber === 1) {
      const prefUrl = `/common/2/${accountId}/preference/${processId}/WorkflowStep/${activityId}/?_application_id=${appId}`;
      await safeApi(prefUrl, "MY TASKS - POST PREFERENCE", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AppId:      processId,
          ConfigJson: { Columns: payload, Filter: {}, Sort: [] },
          ViewId:     activityId,
          ViewType:   "WorkflowStep"
        })
      });
    }

    const dataUrl = `/process/2/${accountId}/${processId}/pending/${activityId}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&_application_id=${appId}`;
    const res = await safeApi(dataUrl, "MY TASKS - GET DATA");

    if (res) {
      const serverCols = deriveDisplayColumns(res.Columns || [], visibleCols, alwaysHidden, protectedCols);
      const finalCols  = [...serverCols, ...extraCols];

      log("🟢 [MY TASKS] final display columns (incl. custom):", finalCols.map(c => c.Id));

      setColumns(finalCols);
      setRows(res.Data || []);
    }
    setLoading(false);
  };

  // ==========================================================================
  //  PARTICIPATED — step counts
  // ==========================================================================
  const fetchParticipatedSteps = async () => {
    log("▶️ fetchParticipatedSteps()");

    const processId = config?.app?.processId;
    if (!requireParams("fetchParticipatedSteps", { accountId, processId })) return;

    setLoading(true);
    setRows([]);
    setColumns([]);
    resetTimerDiag();

    const countUrl = `/process/2/${accountId}/${processId}/participated/activity/count`;
    const stepsData = await safeApi(countUrl, "PARTICIPATED - GET STEP COUNTS");

    if (stepsData && Array.isArray(stepsData)) {
      log("📊 Participated steps:", stepsData);
      setSteps(stepsData);
      if (stepsData.length > 0) {
        const stepToLoad = stepsData.find(s => s.StepName === savedPartStep) || stepsData[0];
        setActivePartId(stepToLoad._id);
        fetchParticipatedData(stepToLoad._id, 1);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  // ==========================================================================
  //  PARTICIPATED — rows + (optional) SLA enrichment
  // ==========================================================================
  const fetchParticipatedData = async (activityId, pageNumber = 1) => {
    log(`▶️ fetchParticipatedData(activityId=${activityId}, page=${pageNumber})`);

    const processId = config?.app?.processId;
    const appId     = config?.app?.appId;
    const pageSize  = config?.app?.pageSize;

    if (!requireParams("fetchParticipatedData", { accountId, processId, appId, pageSize, activityId })) return;

    setLoading(true);
    setRows([]);
    if (pageNumber === 1) setColumns([]);
    resetTimerDiag();

    const partCfg       = config.tabs.participated;
    const visibleCols   = partCfg.visibleColumns;
    const extraCols     = partCfg.extraCustomColumns || [];
    const protectedCols = config.global.protectedColumns;
    const alwaysHidden  = config.global.alwaysHiddenColumns;
    const payload       = buildPayload(visibleCols, processId);
    const breachFlag    = config.featureFlags.showBreachFilterRow === true;

    log("🟢 [PARTICIPATED] visible columns:", visibleCols);

    if (pageNumber === 1) {
      const prefUrl = `/common/2/${accountId}/preference/${processId}/Participated/${activityId}/?_application_id=${appId}`;
      await safeApi(prefUrl, "PARTICIPATED - POST PREFERENCE", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AppId:      processId,
          ConfigJson: { Columns: payload, Filter: {}, Sort: [] },
          ViewId:     activityId,
          ViewType:   "Participated"
        })
      });
    }

    const dataUrl = `/process/2/${accountId}/${processId}/participated/activity/${activityId}?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true&_application_id=${appId}`;
    const res = await safeApi(dataUrl, "PARTICIPATED - GET LIST");

    if (res && res.Data) {
      const serverCols = deriveDisplayColumns(res.Columns || [], visibleCols, alwaysHidden, protectedCols);
      const finalCols  = [...serverCols, ...extraCols];

      log("🟢 [PARTICIPATED] final display columns:", finalCols.map(c => c.Id));
      setColumns(finalCols);

      if (breachFlag) {
        log("🔎 [PARTICIPATED] Running SLA enrichment (one /progress call per row)");

        const enrichedData = await Promise.all(
          res.Data.map(async (row) => {
            if (!row?._id) {
              console.warn("⚠️ [PARTICIPATED] Row missing _id — skipping SLA enrichment for this row");
              return { ...row, _sla_state: "unknown", _is_sla_breached: false, _breach_time: null };
            }

            const progressUrl = `/process/2/${accountId}/${processId}/${row._id}/progress`;
            const progRes = await safeApi(progressUrl, `PROGRESS ${row._id}`, {}, true);

            let slaState   = "unknown";
            let breachTime = null;

            if (progRes && Array.isArray(progRes.Steps)) {
              const targetStep = progRes.Steps.find(s => String(s.Id) === String(activityId));
              if (targetStep) {
                const flag = targetStep.IsSLABreached;
                if      (flag === true)  slaState = "breached";
                else if (flag === false) slaState = "not_breached";
                else {
                  slaState = "unknown";
                  console.warn(`⚠️ IsSLABreached missing/null/undefined for instance: ${row._id}`);
                }
                breachTime = targetStep.BreachTime || null;
              } else {
                console.warn(`❌ No matching step in progress for activityId=${activityId}, instance=${row._id}`);
              }
            } else {
              console.warn(`❌ Progress API returned no Steps array for instance: ${row._id}`);
            }

            return {
              ...row,
              _sla_state: slaState,
              _is_sla_breached: slaState === "breached",
              _breach_time: breachTime
            };
          })
        );
        setRows(enrichedData);
      } else {
        log("⏭️ [PARTICIPATED] Breach filter disabled — skipping SLA enrichment");
        setRows(res.Data);
      }
    }
    setLoading(false);
  };

  // ==========================================================================
  //  PAGINATION + ACTIONS
  // ==========================================================================
  const handlePageChange = (newPage) => {
    log(`📄 Page change → ${newPage}`);
    setPage(newPage);
    if      (parentTabId === "myItems")     fetchMyItems(childTab, newPage);
    else if (parentTabId === "myTasks")     fetchTaskData(activeTaskId, newPage);
    else if (parentTabId === "participated") fetchParticipatedData(activePartId, newPage);
  };

  const handleNewExpense = async () => {
    log("➕ New Expense clicked");
    const popupId = config?.app?.popupId;
    if (!requireParams("handleNewExpense", { popupId })) return;
    try { await kf.app.page.openPopup(popupId, {}); }
    catch (e) { console.error("❌ NEW EXPENSE ERROR:", e); }
  };

  const handleRowClick = async (row) => {
    const popupId = config?.app?.popupId;
    const instanceId = row?._id;
    if (!requireParams("handleRowClick", { popupId, instanceId })) return;

    const activityInstanceId = row._activity_instance_id;
    log(`👆 Row clicked → instance=${instanceId}, activityInstance=${activityInstanceId}`);

    const popupParams = { instance_id: instanceId };
    if (activityInstanceId) popupParams.activity_instance_id = activityInstanceId;

    try { await kf.app.page.openPopup(popupId, popupParams); }
    catch (e) { console.error("❌ POPUP ERROR:", e); }
  };

  // ==========================================================================
  //  RENDER GUARDS — boot phases
  // ==========================================================================
  if (bootPhase === "waiting") {
    return <WaitingScreen attempt={bootAttempt} maxAttempts={BOOT.MAX_RETRIES} />;
  }

  if (bootPhase === "fatal" || bootPhase === "exhausted") {
    return (
      <ConfigErrorScreen
        reason={
          bootPhase === "exhausted"
            ? `KF_LANDING_CONFIG variable was never set after ${BOOT.MAX_RETRIES} attempts.`
            : fatalDetails.reason
        }
        missing={fatalDetails.missing}
      />
    );
  }

  // bootPhase === "ready" — config is guaranteed valid past this point
  if (!accountId) {
    return <WaitingScreen attempt={1} maxAttempts={BOOT.MAX_RETRIES} />;
  }

  // ==========================================================================
  //  CLIENT-SIDE FILTERING
  // ==========================================================================
  let displayedRows = rows;

  let preBreachedCount     = 0;
  let postBreachedCount    = 0;
  let undefinedCount       = 0;
  let allParticipatedCount = 0;

  const breachFlag = config.featureFlags.showBreachFilterRow === true;

  if (parentTabId === "participated" && breachFlag) {
    preBreachedCount  = rows.filter(r => r._sla_state === "not_breached").length;
    postBreachedCount = rows.filter(r => r._sla_state === "breached").length;
    undefinedCount    = rows.filter(r => r._sla_state === "unknown").length;

    const activeStep = steps.find(s => s._id === activePartId);
    allParticipatedCount = activeStep ? activeStep.Count : rows.length;

    if (breachFilter !== "All") {
      displayedRows = rows.filter(r => {
        if (breachFilter === "Pre-Breached")  return r._sla_state === "not_breached";
        if (breachFilter === "Post-Breached") return r._sla_state === "breached";
        if (breachFilter === "Undefined")     return r._sla_state === "unknown";
        return true;
      });
    }
  }

  if (searchQuery.trim() !== "") {
    const lowerQuery = searchQuery.toLowerCase();
    displayedRows = displayedRows.filter(r => {
      return columns.some(c => {
        const val = r[c.Id];
        return toText(val).toLowerCase().includes(lowerQuery);
      });
    });
  }

  // ==========================================================================
  //  PAGINATION TOTAL
  // ==========================================================================
  const pageSize = config.app.pageSize;

  let totalPages = 1;
  if (parentTabId === "myItems") {
    const itemTotal = searchQuery ? displayedRows.length : totalItemsCount;
    totalPages = Math.max(1, Math.ceil(itemTotal / pageSize));
  } else if (parentTabId === "myTasks") {
    const activeStep = steps.find(s => s._id === activeTaskId);
    const taskTotal  = searchQuery ? displayedRows.length : (activeStep?.Count || 0);
    totalPages = Math.max(1, Math.ceil(taskTotal / pageSize));
  } else if (parentTabId === "participated") {
    totalPages = Math.max(1, Math.ceil(displayedRows.length / pageSize));
  }

  // ==========================================================================
  //  RENDER
  // ==========================================================================
  const myItemSubTabs = resolveMyItemsSubTabs(config?.tabs?.myItems);
  const columnRenames = config.global.columnRenames;
  const enabledTabs = (config.ui.enabledTabs || ["myItems", "myTasks", "participated"]);

  const switchParentTab = (tabId) => {
    const t = labelForTab(tabId, config);
    log(`🗂️  Parent tab → ${t} (${tabId})`);
    setParentTab(t);
    setPage(1);
    setRows([]);
    setColumns([]);
    setSearchQuery("");

    if (tabId === "myItems") {
      const firstSubTab = myItemSubTabs[0];
      if (firstSubTab) {
        setChildTab(firstSubTab.id);
        fetchAllMyItemsCounts();
        fetchMyItemsStepCounts();
        fetchMyItems(firstSubTab.id, 1);
      }
    } else if (tabId === "myTasks") {
      fetchMyTasksSteps();
    } else if (tabId === "participated") {
      fetchParticipatedSteps();
    }
  };

  return (
    <div id="root">

      <div className="header-container">
        <div className="tabs-header tabs-header--buttons">
          {enabledTabs.map(tabId => {
            const t = labelForTab(tabId, config);
            return (
              <button
                key={tabId}
                onClick={() => {
                  switchParentTab(tabId);
                }}
                className={`pill-tab ${parentTabId === tabId ? "active" : ""}`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {enabledTabs.length === 3 && (
          <div className="parent-tabs--segmented" data-count="3">
            <div
              className="segmented-indicator parent-segmented-indicator"
              style={{
                transform: `translateX(${Math.max(0, enabledTabs.findIndex(t => t === parentTabId)) * 100}%)`
              }}
            />
            {enabledTabs.map((tabId) => (
              <button
                key={tabId}
                type="button"
                className={`segmented-btn parent-segmented-btn ${parentTabId === tabId ? "active" : ""}`}
                onClick={() => switchParentTab(tabId)}
              >
                <span className="segmented-label">
                  {labelForTab(tabId, config)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="Search all columns..."
            value={searchQuery}
            onChange={(e) => {
               setSearchQuery(e.target.value);
               setPage(1);
            }}
          />
          <button className="btn-new-expense" onClick={handleNewExpense}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Request
          </button>
        </div>
      </div>

      <div className="glass-panel">

        <div className="sub-tabs-container">
          {parentTabId === "myItems" && (
            <>
              <div className="sub-tabs--buttons">
                {myItemSubTabs.map(subTab => {
                  // Resolve count from the correct source for each kind.
                  // Status: server-provided count from /myitems/status/count
                  // Step:   client-side bucketed count from the InProgress scan,
                  //         possibly approximate as "100+" if the scan limit was hit.
                  let countDisplay = null;
                  if (subTab.kind === "status") {
                    const c = myItemsCounts[subTab.filter];
                    countDisplay = c != null ? c : 0;
                  } else if (subTab.kind === "step") {
                    const c = myItemsStepCounts[subTab.filter];
                    countDisplay = c != null ? c : 0;
                  }
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => {
                        log(`📂 My Items sub-tab → ${subTab.label} (${subTab.id})`);
                        setChildTab(subTab.id);
                        setPage(1);
                        setSearchQuery("");
                        fetchMyItems(subTab.id, 1);
                      }}
                      className={`sub-tab ${childTab === subTab.id ? "active" : ""}`}
                    >
                      {subTab.label}
                      {countDisplay !== null && (
                        <span style={{ opacity: 0.7, marginLeft: 4 }}>
                          ({countDisplay})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {myItemSubTabs.length === 3 && (
                <div className="sub-tabs--segmented" data-count="3">
                  <div
                    className="segmented-indicator"
                    style={{
                      transform: `translateX(${Math.max(0, myItemSubTabs.findIndex(t => t.id === childTab)) * 100}%)`
                    }}
                  />
                  {myItemSubTabs.map((subTab) => {
                    let countDisplay = null;
                    if (subTab.kind === "status") {
                      const c = myItemsCounts[subTab.filter];
                      countDisplay = c != null ? c : 0;
                    } else if (subTab.kind === "step") {
                      const c = myItemsStepCounts[subTab.filter];
                      countDisplay = c != null ? c : 0;
                    }
                    return (
                      <button
                        key={subTab.id}
                        type="button"
                        className={`segmented-btn ${childTab === subTab.id ? "active" : ""}`}
                        onClick={() => {
                          log(`📂 My Items sub-tab → ${subTab.label} (${subTab.id})`);
                          setChildTab(subTab.id);
                          setPage(1);
                          setSearchQuery("");
                          fetchMyItems(subTab.id, 1);
                        }}
                      >
                        <span className="segmented-label">
                          {subTab.label}
                        </span>
                        {countDisplay !== null && (
                          <span className="segmented-count">
                            ({countDisplay})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {parentTabId === "myTasks" && (
            <>
              <div className="step-tabs--buttons">
                {steps.map(s => (
                  <button
                    key={s._id}
                    onClick={() => {
                      log(`📂 My Tasks step → ${s.StepName}`);
                      setActiveTaskId(s._id);
                      localStorage.setItem('kf_activeTaskStep', s.StepName);
                      setPage(1);
                      setSearchQuery("");
                      fetchTaskData(s._id, 1);
                    }}
                    className={`sub-tab ${activeTaskId === s._id ? "active" : ""}`}
                  >
                    {s.StepName} <span style={{ opacity: 0.7, marginLeft: 4 }}>({s.Count})</span>
                  </button>
                ))}
              </div>

              <div className="step-tabs--select">
                <select
                  className="tabs-select"
                  value={activeTaskId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const step = steps.find(x => x._id === id);
                    if (!step) return;
                    log(`📂 My Tasks step → ${step.StepName}`);
                    setActiveTaskId(id);
                    localStorage.setItem('kf_activeTaskStep', step.StepName);
                    setPage(1);
                    setSearchQuery("");
                    fetchTaskData(id, 1);
                  }}
                >
                  {steps.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.StepName} ({s.Count})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {parentTabId === "participated" && (
            <>
              <div className="step-tabs--buttons">
                {steps.map(s => (
                  <button
                    key={s._id}
                    onClick={() => {
                      log(`📂 Participated step → ${s.StepName}`);
                      setActivePartId(s._id);
                      localStorage.setItem('kf_activePartStep', s.StepName);
                      setPage(1);
                      setSearchQuery("");
                      fetchParticipatedData(s._id, 1);
                    }}
                    className={`sub-tab ${activePartId === s._id ? "active" : ""}`}
                  >
                    {s.StepName} <span style={{ opacity: 0.7, marginLeft: 4 }}>({s.Count})</span>
                  </button>
                ))}
              </div>

              <div className="step-tabs--select">
                <select
                  className="tabs-select"
                  value={activePartId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const step = steps.find(x => x._id === id);
                    if (!step) return;
                    log(`📂 Participated step → ${step.StepName}`);
                    setActivePartId(id);
                    localStorage.setItem('kf_activePartStep', step.StepName);
                    setPage(1);
                    setSearchQuery("");
                    fetchParticipatedData(id, 1);
                  }}
                >
                  {steps.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.StepName} ({s.Count})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {parentTabId === "participated" && breachFlag && (
          <div
            className="breach-toggle-container"
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
              background: 'rgba(248, 250, 252, 0.5)'
            }}
          >
            <div className="breach-toggle--buttons">
              {["All", "Pre-Breached", "Post-Breached", "Undefined"].map(filter => {
                let dynamicCount = 0;
                if (filter === "All")           dynamicCount = allParticipatedCount;
                if (filter === "Pre-Breached")  dynamicCount = preBreachedCount;
                if (filter === "Post-Breached") dynamicCount = postBreachedCount;
                if (filter === "Undefined")     dynamicCount = undefinedCount;

                return (
                  <button
                    key={filter}
                    onClick={() => { setBreachFilter(filter); setPage(1); }}
                    className={`sub-tab ${breachFilter === filter ? "active" : ""}`}
                    style={{
                      padding: '6px 16px',
                      fontSize: '13px',
                      border: breachFilter === filter ? '1px solid #5084bc' : '1px solid #e2e8f0',
                      boxShadow: breachFilter === filter ? '0 2px 4px rgba(80,132,188,0.1)' : 'none'
                    }}
                  >
                    {filter} <span style={{ opacity: 0.7, marginLeft: 4, fontWeight: 600 }}>({dynamicCount})</span>
                  </button>
                );
              })}
            </div>

            <div className="breach-toggle--select">
              <select
                className="tabs-select"
                value={breachFilter}
                onChange={(e) => { setBreachFilter(e.target.value); setPage(1); }}
              >
                {["All", "Pre-Breached", "Post-Breached", "Undefined"].map(filter => {
                  let dynamicCount = 0;
                  if (filter === "All")           dynamicCount = allParticipatedCount;
                  if (filter === "Pre-Breached")  dynamicCount = preBreachedCount;
                  if (filter === "Post-Breached") dynamicCount = postBreachedCount;
                  if (filter === "Undefined")     dynamicCount = undefinedCount;
                  return (
                    <option key={filter} value={filter}>
                      {filter} ({dynamicCount})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        <div className="table-scroll-area">
          {loading ? (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 10 }} className="bounce-icon">⏳</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Loading…</div>
            </div>
          ) : displayedRows?.length > 0 ? (
            <table style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  {columns.map(c => {
                    const displayName = columnRenames[c.Id] || c.Name || c.Id;
                    return <th key={c.Id}>{displayName}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r, i) => {
                  let rowClass = "table-row";
                  let rowInlineStyle = { cursor: 'pointer' };

                  // ---- Resolve which tab's config to read SLA settings from ----
                  const activeTabCfg =
                    parentTabId === "myTasks"     ? config.tabs.myTasks :
                    parentTabId === "participated" ? config.tabs.participated :
                    null;

                  // Step name: find the currently selected step in the steps[] array.
                  // For My Tasks → activeTaskId; for Participated → activePartId.
                  // This is what we key per-step SLA overrides on.
                  const activeStepId = parentTabId === "myTasks" ? activeTaskId
                                     : parentTabId === "participated" ? activePartId
                                     : null;
                  const activeStepName = steps.find(s => s._id === activeStepId)?.StepName;

                  // Resolve SLA spec (component defaults < tab defaults < per-step override)
                  const slaSpec = activeTabCfg
                    ? resolveSlaSpec(activeTabCfg, activeStepName)
                    : null;

                  // ---- Compute time-left and apply warning/breached styling ----
                  let diffMs = null;
                  let deadlineMs = null;
                  const timerEnabled = activeTabCfg && tabHasTimer(activeTabCfg.extraCustomColumns);

                  // ====== UNCONDITIONAL DIAGNOSTIC DUMP ======
                  // Logs ONCE per fetch (only for i===0, the first row in the table).
                  // No conditions on timerEnabled, slaSpec, etc. — we want to see the
                  // state regardless. This makes it impossible to "silently skip".
                  if (i === 0 && !TIMER_DIAG_SEEN.has("dumped-this-fetch")) {
                    TIMER_DIAG_SEEN.add("dumped-this-fetch");

                    const sourceField = slaSpec?.sourceField;
                    const rawValue    = sourceField ? r[sourceField] : undefined;
                    const parsed      = sourceField ? parseDeadlineValue(rawValue) : NaN;

                    console.log("════════════════════════════════════════════════════════════");
                    console.log("🔬 [TIMER DIAGNOSTIC DUMP] (first row only — pasting whole thing)");
                    console.log("════════════════════════════════════════════════════════════");
                    console.log("parentTabId:           ", parentTabId);
                    console.log("activeTabCfg present:  ", !!activeTabCfg);
                    console.log("activeStepName:        ", activeStepName);
                    console.log("timerEnabled:          ", timerEnabled);
                    console.log("slaSpec:               ", slaSpec);
                    console.log("sourceField configured:", sourceField);
                    console.log("rawValue from row:     ", rawValue);
                    console.log("rawValue typeof:       ", typeof rawValue);
                    console.log("rawValue JSON:         ", JSON.stringify(rawValue));
                    console.log("parseDeadlineValue() →", parsed, isNaN(parsed) ? "(NaN — could not parse)" : "→ " + new Date(parsed).toISOString());
                    console.log("ms until deadline:     ", isNaN(parsed) ? "N/A" : (parsed - now));
                    console.log("ALL ROW KEYS:          ", Object.keys(r));
                    console.log("FULL ROW (first):      ", r);
                    console.log("════════════════════════════════════════════════════════════");
                  }

                  if (timerEnabled && slaSpec && r[slaSpec.sourceField]) {
                    const deadlineTime = parseDeadlineValue(r[slaSpec.sourceField]);
                    if (!isNaN(deadlineTime)) {
                      deadlineMs = deadlineTime;
                      diffMs = deadlineTime - now;

                      if (diffMs <= 0) {
                        // Breached. Use config colors if provided, else CSS class.
                        if (slaSpec.breachedRowBg) {
                          rowInlineStyle = {
                            ...rowInlineStyle,
                            backgroundColor: slaSpec.breachedRowBg,
                            color:           slaSpec.breachedTextColor || undefined
                          };
                        } else {
                          rowClass += " row-breached";
                        }
                      } else if (diffMs <= slaSpec.warningThresholdMs) {
                        // Warning zone. Use config colors if provided, else CSS class.
                        if (slaSpec.warningRowBg) {
                          rowInlineStyle = {
                            ...rowInlineStyle,
                            backgroundColor: slaSpec.warningRowBg,
                            color:           slaSpec.warningTextColor || undefined
                          };
                        } else {
                          rowClass += " row-warning";
                        }
                      }
                    }
                  }

                  // ---- Participated: status-keyword row coloring (still hardcoded) ----
                  if (parentTabId === "participated") {
                    const rowStatus = (toText(r._status) || "").toLowerCase();
                    if      (rowStatus.includes("reject"))    rowClass += " row-rejected";
                    else if (rowStatus.includes("complet"))   rowClass += " row-completed";
                    else if (rowStatus.includes("withdraw"))  rowClass += " row-withdrawn";
                  }

                  return (
                    <tr key={i} className={rowClass} onClick={() => handleRowClick(r)} style={rowInlineStyle}>
                      {columns.map(c => {

                        if (c.Id === "kf_custom_timer") {
                          const badge = diffMs !== null ? slaBadgeMeta(diffMs) : null;
                          return (
                            <td key={c.Id}>
                              {badge ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {formatSlaDeadlineDate(deadlineMs)}
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 10px',
                                      borderRadius: 9999,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                      fontVariantNumeric: 'tabular-nums',
                                      background: badge.bg,
                                      color: badge.color,
                                      border: `1px solid ${badge.border}`,
                                    }}
                                  >
                                    <span aria-hidden="true">{badge.icon}</span>
                                    <span>{badge.label}</span>
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                          );
                        }

                        const val = r[c.Id];

                        if (c.Id === "_current_assigned_to" || c.Id === "currentlu_assigned_to") {
                          return <td key={c.Id}><AssigneeCell value={val} /></td>;
                        }

                        let text = toText(val);
                        if ((c.Type === "DateTime" || c.Id.toLowerCase().includes("deadline")) && text && !isNaN(Date.parse(text))) {
                          text = new Date(text).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          });
                        }

                        return (
                          <td key={c.Id} title={text}>
                            {text || <span style={{color: '#cbd5e1'}}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {searchQuery ? `No results found for "${searchQuery}"` : "No items found"}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {searchQuery ? "Try searching for something else." : "You're all caught up!"}
              </div>
            </div>
          )}
        </div>

        {!loading && (rows.length > 0 || page > 1) && (
          <div className="pagination-container">
            <button className="page-btn" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
              ← Previous
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 10px' }}>
              {page} / {totalPages}
            </span>
            <button className="page-btn" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DefaultLandingComponent;
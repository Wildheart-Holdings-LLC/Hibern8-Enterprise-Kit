/* Hibern8 Ctrl+Space - Enterprise managed-policy + security-alert module.
   Drop this file into the extension folder and load it BEFORE options.js /
   dashboard.js / lite.js on any page that reads settings. Chrome/Edge/Firefox
   compatible. NO network unless an admin explicitly sets a reporting endpoint
   AND deploys the reporting-enabled manifest (see ADMIN-DEPLOYMENT-GUIDE.md). */
var chrome = (typeof browser !== "undefined") ? browser : globalThis.chrome;

const HibernAdmin = (() => {
  // Policy keys admins may set via managed storage. Each maps to the extension's
  // existing storage.local setting key (declared in managed_schema.json for Chrome,
  // and delivered via policies.json "3rdparty" for Firefox).
  const KEYS = [
    "idleDefault",            // number, seconds (auto-snooze threshold)
    "socialEnabled",          // boolean (screen-time timer on/off)
    "socialDomains",          // array<string> (tracked sites)
    "safeHoldEngageStartup",  // boolean
    "requireVpn",             // boolean (manual VPN confirmation gate)
    "holdPrevSession",        // boolean (full build)
    "shStartup",              // boolean (Lite/HiberSpace Safe-Hold: engage at startup)
    "shRequireVpn",           // boolean (Lite/HiberSpace: require VPN confirmation before resume)
    "lockSettings",           // boolean: if true, users cannot change managed values
    "securityReportingEndpoint" // https URL or "" (optional; opt-in, needs reporting manifest)
  ];
  const SETTING_KEYS = KEYS.filter(k => k !== "lockSettings" && k !== "securityReportingEndpoint");

  async function managed() {
    try { return (await chrome.storage.managed.get(KEYS)) || {}; }
    catch (e) { return {}; }   // not managed / no policy present
  }

  // Effective config: managed (admin) values override local for any key the admin set.
  // Returns { config, managed, locked:Set, isManaged }.
  async function config() {
    const m = await managed();
    let local = {};
    try { local = await chrome.storage.local.get(SETTING_KEYS); } catch (e) {}
    const merged = Object.assign({}, local);
    const locked = new Set();
    for (const k of SETTING_KEYS) {
      if (m[k] !== undefined) { merged[k] = m[k]; if (m.lockSettings) locked.add(k); }
    }
    return { config: merged, managed: m, locked, isManaged: Object.keys(m).length > 0 };
  }

  // Apply lock state to a form control: sets the value and disables it when locked,
  // with a title explaining it is managed by the organization.
  function applyLock(el, locked, note) {
    if (!el || !locked) return;
    el.disabled = true;
    el.title = note || "Managed by your organization";
    el.setAttribute("data-managed", "1");
  }

  // ---- Security alert log (local, capped) ----
  const ALERT_KEY = "adminSecurityAlerts";
  const CAP = 200;
  async function logAlert(alert) {
    // alert: { type:"injection"|"scan-recommended", blocked, source, tabUrl }
    const rec = Object.assign({ ts: new Date().toISOString() }, alert || {});
    let list = [];
    try { const r = await chrome.storage.local.get(ALERT_KEY); list = r[ALERT_KEY] || []; } catch (e) {}
    list.push(rec); if (list.length > CAP) list = list.slice(-CAP);
    try { await chrome.storage.local.set({ [ALERT_KEY]: list }); } catch (e) {}
    // Optional admin-configured live reporting. Off unless an https endpoint is set in
    // policy; also requires the reporting-enabled manifest whose CSP/host_permissions
    // allow the endpoint (otherwise the strict default CSP blocks it - by design).
    try {
      const m = await managed();
      const ep = m.securityReportingEndpoint;
      if (ep && /^https:\/\//i.test(ep)) {
        fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(rec) }).catch(() => {});
      }
    } catch (e) {}
    return rec;
  }
  async function getAlerts() {
    try { const r = await chrome.storage.local.get(ALERT_KEY); return r[ALERT_KEY] || []; }
    catch (e) { return []; }
  }
  async function clearAlerts() { try { await chrome.storage.local.set({ [ALERT_KEY]: [] }); } catch (e) {} }

  function toJson(list) {
    return JSON.stringify({ product: "Hibern8 Ctrl+Space", exportedAt: new Date().toISOString(),
                            count: list.length, alerts: list }, null, 2);
  }
  function toCsv(list) {
    const head = "ts,type,blocked,source,tabUrl";
    const esc = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    return [head, ...list.map(a => [a.ts, a.type, a.blocked, a.source, a.tabUrl].map(esc).join(","))].join("\n");
  }
  // Download the alert log locally (call from a user gesture on an extension page).
  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime || "application/octet-stream" }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  async function exportAlerts(format) {
    const list = await getAlerts();
    if (format === "csv") download("hibern8-security-alerts.csv", toCsv(list), "text/csv");
    else download("hibern8-security-alerts.json", toJson(list), "application/json");
  }

  return { KEYS, SETTING_KEYS, managed, config, applyLock, logAlert, getAlerts, clearAlerts, exportAlerts, toJson, toCsv };
})();

if (typeof module !== "undefined") module.exports = HibernAdmin;

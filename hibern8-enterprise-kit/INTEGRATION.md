# Integrating the enterprise kit into Hibern8 Ctrl+Space and Lite (HiberSpace)

Drop `managed.js` and `managed_schema.json` into each build folder, then apply the
hooks below. `managed.js` is browser-agnostic (chrome/browser alias).

## A. Full build - Hibern8 Ctrl+Space (Chrome/Edge and Firefox)

1. **Manifest (Chrome/Edge only):** add
   `"storage": { "managed_schema": "managed_schema.json" }`.
   (Firefox reads managed storage from policies.json - no manifest change.)

2. **options.html:** load the module before options.js:
   `<script src="managed.js"></script>` then `<script src="options.js"></script>`

3. **options.js - apply + lock** (after your existing `load()` populates the form):
   ```js
   const { config, locked } = await HibernAdmin.config();
   const map = { idleDefault:"idle", socialEnabled:"socialEnabled",
     socialDomains:"socialDomains", safeHoldEngageStartup:"safeHoldEngageStartup",
     requireVpn:"requireVpn", holdPrevSession:"holdPrevSession" };
   for (const [key, id] of Object.entries(map)) {
     const el = document.getElementById(id); if (!el) continue;
     if (config[key] !== undefined) {
       if (el.type === "checkbox") el.checked = !!config[key];
       else if (id === "socialDomains") el.value = (config[key]||[]).join("\n");
       else el.value = config[key];
     }
     HibernAdmin.applyLock(el, locked.has(key));
   }
   ```
   In `save()`, skip any key in `locked` so a disabled control can't be persisted over.

4. **Security alerts - log** where the injection watchdog fires (dashboard.js
   `securitypolicyviolation` handler) and where the AV-scan notification is raised
   (background.js): `HibernAdmin.logAlert({ type:"injection", blocked, source, tabUrl });`
   and `{ type:"scan-recommended", ... }`. (Load managed.js in dashboard.html too.)

5. **Security alerts - export UI** (options.html): add buttons that call
   `HibernAdmin.exportAlerts("json")`, `HibernAdmin.exportAlerts("csv")`, and
   `HibernAdmin.clearAlerts()`.

## B. Lite build - HiberSpace

Lite has no options page; its managed keys are `shStartup` and `shRequireVpn`.

1. **lite.html:** `<script src="managed.js"></script>` before `<script src="lite.js"></script>`.

2. **lite.js - apply + lock** inside `loadShPrefs()` (which sets the two Safe-Hold
   checkboxes): after reading storage.local, overlay managed values and lock:
   ```js
   const { config, locked } = await HibernAdmin.config();
   if (config.shStartup    !== undefined) $("shStartup").checked    = !!config.shStartup;
   if (config.shRequireVpn !== undefined) $("shRequireVpn").checked = !!config.shRequireVpn;
   HibernAdmin.applyLock($("shStartup"),    locked.has("shStartup"));
   HibernAdmin.applyLock($("shRequireVpn"), locked.has("shRequireVpn"));
   ```
   Guard the two `onchange` handlers so they no-op when the control is disabled.

3. **Security alerts - log** in the Lite `securitypolicyviolation` handler:
   `HibernAdmin.logAlert({ type:"injection", blocked, source });`

4. **Export UI:** add an "Export security alerts (JSON/CSV)" control to the Lite
   Help panel calling `HibernAdmin.exportAlerts(...)`.

5. **Firefox Lite:** if you ship one, give it a gecko id and add a matching
   `3rdparty.Extensions.<id>` block in policies.json.

## Notes
- No behavior changes when the extension is unmanaged: `chrome.storage.managed` is
  empty, so `config` falls back to local settings and nothing is locked.
- Keep existing storage keys/ids unchanged - the hooks rely on them.

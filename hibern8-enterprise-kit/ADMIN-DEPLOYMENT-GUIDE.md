# Hibern8 Ctrl+Space - Enterprise Deployment & Permissioning Guide

Applies to the full build (Hibern8 Ctrl+Space) and the Lite build (HiberSpace),
on Chrome, Edge, and Firefox. Two things are covered: (1) force-installing the
extension on managed machines, and (2) configuring and locking its settings via
managed policy. Security alerts (script-injection blocked / antivirus scan
recommended) are captured locally and can be exported for your MDM/SIEM.

## What admins can configure and lock

Delivered through managed storage (schema: managed_schema.json). Keys:

| Key | Applies to | Meaning |
|---|---|---|
| idleDefault | full | Auto-snooze idle threshold (seconds) |
| socialEnabled | full | Screen-time timer on/off |
| socialDomains | full | Preset tracked-sites list |
| safeHoldEngageStartup | full | Engage Safe-Hold at startup |
| requireVpn | full | Require manual VPN confirmation before resuming traffic |
| holdPrevSession | full | Hold previous-session tabs until reviewed |
| shStartup | Lite/HiberSpace | Engage Safe-Hold at startup |
| shRequireVpn | Lite/HiberSpace | Require manual VPN confirmation before resuming |
| lockSettings | both | If true, users see managed values but cannot change them |
| securityReportingEndpoint | both | OPTIONAL https URL for live alert reporting (see below) |

Set `lockSettings: true` to make the above read-only for end users. Any key you
omit stays user-controlled.

## 1) Distribution

### A. Store + policy on top (simplest)
Publish to the Chrome Web Store / Edge Add-ons / Firefox AMO, then force-install
by extension ID and layer configuration policy (Section 2).

### B. Self-hosted force-install (private, no public store)
- Chrome/Edge: host the packed .crx plus an `update.xml`; force-install via
  `ExtensionInstallForcelist` ("ID;https://YOUR-HOST/update.xml"), and allow the
  self-hosted source with `ExtensionInstallAllowlist` / `ExtensionInstallSources`.
- Firefox: submit for signing to AMO as "unlisted" to get a signed .xpi, host it,
  and force-install via the `ExtensionSettings` policy with `install_url`
  (see policies/firefox-policies.json).

## 2) Configuration policy

### Chrome / Edge
- Registry/GPO: see policies/chrome-edge-policy.reg (Chrome path
  `...\Policies\Google\Chrome\3rdparty\extensions\<ID>\policy`; Edge uses
  `...\Microsoft\Edge\...`). Values must match managed_schema.json.
- Intune: Devices > Configuration > (Chrome/Edge ADMX or a Settings Catalog
  "3rd party extension" policy). Or push the registry keys via a custom OMA-URI /
  PowerShell script. Booleans are DWORD 1/0; arrays as JSON strings where required.
- The extension's Chrome manifest must declare
  `"storage": { "managed_schema": "managed_schema.json" }` (already done in the
  enterprise build - see INTEGRATION.md).

### Firefox
- Deliver policies.json (see policies/firefox-policies.json). Place it in the
  Firefox `distribution/` folder, or push via the Firefox ADMX/GPO, or macOS
  configuration profile. The `3rdparty.Extensions.<id>` block populates
  `browser.storage.managed`. The `<id>` must match the extension's gecko id.
- Full build id: hibern8@wildheartholdingsllc.com. If you ship a Firefox Lite,
  give it its own gecko id and a matching 3rdparty block.

## 3) Security alert export (script vulnerabilities / scan recommended)

The injection watchdog already blocks and warns on any attempted script injection.
In the enterprise build, each event is also written to a local, capped log
(`adminSecurityAlerts` in storage.local): `{ ts, type, blocked, source, tabUrl }`
where type is "injection" or "scan-recommended".

- **Local export (default, no network):** users/admins export the log as JSON or
  CSV from the Security-alerts control (full build: options page; Lite: Help
  panel). Collect these files via your MDM/endpoint tooling. Nothing leaves the
  device automatically - consistent with the product's no-data posture.
- **Optional live reporting (opt-in):** set `securityReportingEndpoint` to an
  https URL in policy. Alerts are then POSTed there as JSON. This ONLY works if you
  deploy the reporting-enabled manifest variant, whose CSP `connect-src` and
  `host_permissions` allow that endpoint; the default enterprise build keeps the
  strict `connect-src 'self'` and will not send anything. Enabling live reporting
  transmits security-event metadata off-device - disclose it in your own policy.

## 4) Verifying the policy took effect
- Chrome: visit `chrome://policy` (Reload policies) and confirm the keys appear
  under the extension. Edge: `edge://policy`.
- Firefox: `about:policies#active` shows applied policies; `about:addons` shows the
  force-installed add-on as managed (cannot be removed by the user).
- In the extension, managed controls appear disabled with a "Managed by your
  organization" tooltip when `lockSettings` is true.

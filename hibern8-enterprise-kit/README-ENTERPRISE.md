# Hibern8 Ctrl+Space - Enterprise Kit

A drop-in layer that turns the standard Hibern8 Ctrl+Space (full) and HiberSpace
(Lite) builds into enterprise/admin-manageable extensions: force-installable,
configurable and lockable via managed policy, with local (optionally reported)
security-alert export. No data leaves the device unless an admin explicitly opts
in to a reporting endpoint.

## Contents
- managed.js               - managed-policy reader/merger + lock helper + alert log/export
- managed_schema.json      - Chrome/Edge managed-policy schema (the lockable keys)
- policies/firefox-policies.json - Firefox force-install + managed-storage example
- policies/chrome-edge-policy.reg - Chrome/Edge force-install + config (registry/GPO)
- ADMIN-DEPLOYMENT-GUIDE.md - deploy + configure on Chrome/Edge/Firefox, both distribution paths
- INTEGRATION.md           - exact hooks for the full build AND Lite (HiberSpace)

## Quick start
1. Copy managed.js + managed_schema.json into each build folder.
2. Apply the hooks in INTEGRATION.md (full build + Lite).
3. Force-install and configure per ADMIN-DEPLOYMENT-GUIDE.md.
4. Verify at chrome://policy, edge://policy, or about:policies#active.

Not legal/compliance advice; review policy and reporting choices with your admins.

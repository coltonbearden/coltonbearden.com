# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`coltonbearden.com` — Colton Bearden's personal-professional domain. The Astro site lives in `site/` and deploys to Cloudflare Workers static assets; it is **live** at https://coltonbearden.com.

GitHub: `coltonbearden/coltonbearden.com` (public). Transferred on 2026-08-22 from `FirstCastSolutions423` — a **different** GitHub account (ids 208834784 vs 225264680), not a rename. Anything keyed to the GitHub account id (the Workers Builds connection, GitHub App installs) had to be redone; keep that in mind if it ever moves again.

## Commands (site/ — Astro Surface)

- `pnpm --dir site dev` — dev server
- `pnpm --dir site build` — production build to `site/dist`
- `pnpm --dir site check` — astro type/content check
- `pnpm --dir site test` — vitest unit tests
- `pnpm --dir site run deploy` — manual deploy (CI deploys on push to `main`)

Design of record: `docs/superpowers/specs/2026-07-15-severed-floor-design.md`.
Surface pages ship **zero JS** — do NOT add an analytics snippet. Cloudflare Web Analytics uses Automatic setup (edge-injected beacon for real browsers only); `curl`/CI never sees it, and that's expected — keep it that way.

## Phases and current state

Four-phase plan: **F** Foundation → **P** Presence → **C** Commercial → **I** Infra (optional). Phase 2 (Presence) is **superseded** by the Severed Floor design (`docs/superpowers/specs/2026-07-15-severed-floor-design.md`) and its Season 1a/1b/1c execution split.

- **Phase 1 (Foundation) — complete** (2026-07-14), with open tails:
  - Scoped `Zone:DNS:Edit` Cloudflare API token → 1Password (plan Task 1).
  - DMARC ramp `p=none → quarantine → reject` (plan Task 10): `p=quarantine` since 2026-09-04; `p=reject` still pending.
  - CAA issuance spot-check at the next Universal SSL renewal.
- **Season 1a (Surface & Platform) — shipped 2026-07-15.** Site is live on Workers static assets (worker `coltonbearden-com`) with custom domains for apex, `www`, and `mta-sts`; `www` → apex 301 redirect rule; Workers Builds CI deploys pushes to `main` (root dir `site/`, connected to `coltonbearden/coltonbearden.com` since the 2026-09-04 reconnect — the dashboard reconnect reset root dir to `/`; it was corrected to `site` via `PATCH /accounts/{acct}/builds/workers/{script_tag}` and the two triggers, so check those three if builds ever fail right after a reconnect), and PRs get preview builds plus a Lighthouse gate (`.github/workflows/quality.yml`, all 8 pages ≥ 0.95 Performance/Best-Practices/SEO).
- **2026-09-03 refresh** (first touch after ~7 idle weeks): deps updated in range (astro 7.2.x, wrangler 4.128.x) clearing 17 Dependabot advisories; CI actions moved to current majors with `permissions: contents: read` and `@lhci/cli` pinned; `.github/dependabot.yml` added (weekly, grouped, npm in `site/` + github-actions). TypeScript stays on 6.x — `@astrojs/check` peer is `^5 || ^6`. Dependabot runs had sat queued-then-cancelled since 2026-07-24 (job label `dependabot`, no runner); if that recurs, check repo Settings → Code security → Dependabot runner setting before anything else.
- **Gate status:**
  - MTA-STS — **closed.** `mode: enforce` / `max_age: 1209600` live since 2026-09-04 (PR #4, production deployment `155b3f72`); `_mta-sts` TXT (`25de991060c16900a13807a51fdd0b6a`) id bumped to `20260904T073853Z` after the policy was observed live. Any future policy change: edit the file, deploy, confirm via curl, then bump the id again.
  - DMARC — **one step left.** `p=quarantine` since 2026-09-04T07:38Z (record `d20df6dfa9f8a92b0b13608f4758df00`), after the user confirmed a clean `rua` window. `p=reject` follows after another clean window (earliest ~2026-09-18) with fresh user confirmation (D4).
- **Next:** S1b (AI spine) and S1c (the Descent) — see `docs/superpowers/plans/2026-07-15-season1a-surface-platform.md` for the deferred-work split.
- **Phases 3–4 — deferred/conditional.** Do not build speculatively.

## Key documents

- `docs/superpowers/plans/2026-07-14-coltonbearden-com-phase1-foundation.md` — Phase 1 execution record: verified live zone state, DNS record IDs, per-task verification evidence. **Source of truth** for what was actually done.
- `docs/specs/coltonbearden-com-blueprint.md` — design blueprint. **Reference context only**; its assumptions were corrected during execution (e.g., primary mailbox is `inbox@`, not `colton@`). Where the two disagree, trust the plan doc.

## Operational facts (verified live 2026-07-14; site launch 2026-07-15)

- Zone `coltonbearden.com`: zone_id `bc9faf24541428e9ed5f3687d9ede3ef`, account `9a06f3b33d177e286938eec3240c6679`.
- Email: Migadu. Primary mailbox `inbox@coltonbearden.com`; aliases `security@`, `dmarc@`, `tlsrpt@` forward to it.
- **Cloudflare MCP permission gap:** the MCP token can read/write DNS *records* and Workers *domains/deployments* fine, but returns 401/403 on zone *settings* (`dnssec`, `settings/ssl`, `settings/min_tls_version`, `settings/always_use_https`, `settings/automatic_https_rewrites`, `settings/security_header`) and 10000 auth errors on zone *rulesets* (redirect rules) and account RUM/Web Analytics APIs. Zone settings, redirect rules, and Web Analytics site management are all dashboard-manual — don't burn time retrying via API.
- Cloudflare error pages don't carry zone security headers (historical footgun from the pre-launch parking placeholder — kept for reference); if a request ever 5xx's, verify edge headers against `https://coltonbearden.com/cdn-cgi/trace` instead.
- **Known DNS records added outside any plan** (seen 2026-09-03; not leftovers to clean up without asking): `_tailscale-challenge` TXT (2026-07-23), `_acme-challenge` TXT at apex (2026-07-28, a DNS-01 issuance by something outside this repo), `docker-verification` TXT at apex and `answer.` (2026-08-13), `_gh-first-cast-solutions-llc-{e,o}` TXT (2026-07-15, GitHub org domain verification), `*._domainkey` empty DKIM (2026-05-20, pre-Migadu; the specific `key1-3` CNAMEs win). User reviewed the list on 2026-09-04 and chose to keep all of them as-is.
- `/.well-known/security.txt` (RFC 9116) is served from `site/public/.well-known/security.txt`, contact `security@coltonbearden.com`, **`Expires: 2027-09-01`** — refresh the date before then or the file becomes invalid.
- Resolvers show Cloudflare's auto-injected CAA `issue`/`issuewild` entries for its own CAs next to the zone's `issuewild ";"` — that is Universal SSL working as designed (the edge cert is a wildcard), not a regression of D6. The edge cert issued 2026-07-15 expires 2026-10-13; do the Phase 1 CAA spot-check at that renewal.
- This machine's `nslookup`/`Resolve-DnsName` cannot query CAA or DNSKEY record types. Use DNS-over-HTTPS (`curl "https://cloudflare-dns.com/dns-query?name=<name>&type=<type>" -H "accept: application/dns-json"`) or the Cloudflare API.

## Guardrails (from the decision log — do not silently violate)

- **Never delete or overwrite a DNS record without showing the exact before/after and getting explicit user go-ahead.** Several records are deliberate hardening baselines, not leftovers.
- CAA `issuewild ";"` stays blocked (D6). Relaxing wildcards requires a new decision-log entry.
- HSTS `preload` stays **off** (D5, reaffirmed as D21 on 2026-09-04) until the S1b/S1c subdomains exist and are stable.
- DMARC tightens one step at a time, each after a clean monitoring window and with user confirmation (D4).
- Commercial/product work likely belongs on a FirstCast-branded domain, not this one (D9).

## Repository layout

- `docs/specs/` — design blueprints. `docs/superpowers/plans/` — implementation plans and execution records.
- `cloudflare/` — **gitignored local reference**: a clone of `github.com/cloudflare/skills` (own `.git`) and an agents-SDK scratch install. Not project source; never commit it.

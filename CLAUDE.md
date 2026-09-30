# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`coltonbearden.com` — Colton Bearden's personal website and a lifelong, multi-purpose domain, owned and built on indefinitely. The Astro site lives in `site/` and deploys to Cloudflare Workers static assets; it is **live** at https://coltonbearden.com. The repo is also the domain's operating record.

Direction (D27, 2026-09-30) — three lanes:

1. **Public presence** — what the owner wants public: professional presence and portfolio, links to social accounts, a catalog of the best public GitHub repositories, a blog ("Notes" at `/blog/`, D29).
2. **Domain operations** — everything that uses the domain: email (Migadu; DMARC, MTA-STS, TLS-RPT), DNS and zone settings, certificates and CAA, redirect rules, the Workers deploy, `security.txt`, and every future use (subdomains for apps and services, short links, hosted MCP servers, identity proofs, …). Record: `docs/domain/README.md` (D28).
3. **Design** — how the presence lane looks. The Severed Floor spec is **design candidate A**, not a design of record; other candidates are prototyped on branches and compared via Workers Builds preview URLs, and the winner merges.

FirstCast is retired (D27): it may appear on the site only as work history — not as a design candidate's fictional corporation, a blog name, a doc-number prefix, a DNS verification record or an account label.

GitHub: `coltonbearden/coltonbearden.com` (public). Transferred on 2026-08-22 from a **different** GitHub account (ids 208834784 vs 225264680), not a rename. Anything keyed to the GitHub account id (the Workers Builds connection, GitHub App installs) had to be redone; keep that in mind if it ever moves again.

## Commands (run from `site/`)

Run pnpm from inside `site/`: corepack picks the pnpm version from the current directory's `package.json`, so `pnpm --dir site …` from the repo root can resolve the wrong pnpm on some machines.

- `cd site && pnpm dev` — dev server
- `cd site && pnpm build` — production build to `site/dist`
- `cd site && pnpm check` — astro type/content check
- `cd site && pnpm test` — vitest unit tests
- `cd site && pnpm run ci:build` — **the deploy gate**: check, test, build, link check; Workers Builds runs it before every deploy and CI runs it on every PR
- `cd site && pnpm run deploy` — manual deploy (CI deploys on push to `main`)
- `node --test tools/dns/lib.test.mjs` — DNS tool unit tests (repo root; also in CI)

## Domain lane — operational facts

- Zone `coltonbearden.com`: zone_id `bc9faf24541428e9ed5f3687d9ede3ef`, account `9a06f3b33d177e286938eec3240c6679`. Registrar: Cloudflare. Registry of every name in the zone, registrar facts, hygiene principles, email conventions and the DNS snapshot: `docs/domain/README.md`.
- **Site delivery.** Workers static assets (worker `coltonbearden-com`, D12) with custom domains for apex, `www` and `mta-sts`. The `workers.dev` route is off since 2026-09-30 (`workers_dev: false`, with `preview_urls: true` keeping PR preview URLs, D25). `www` → apex and `mta-sts` (everything outside `/.well-known/`) → apex 301 redirect rules (D25).
- **Workers Builds CI** deploys pushes to `main` (root dir `site/`, connected to `coltonbearden/coltonbearden.com` since the 2026-09-04 reconnect — the dashboard reconnect reset root dir to `/`; it was corrected to `site` via `PATCH /accounts/{acct}/builds/workers/{script_tag}` and the two triggers, so check those three if builds ever fail right after a reconnect). PRs get preview builds plus a Lighthouse gate (`.github/workflows/quality.yml`, all 8 pages ≥ 0.95 Performance/Accessibility/Best-Practices/SEO).
- **Deploy gate — closed** 2026-09-30 (D22). Ruleset `main-protection` on `main` (PR required, squash only, no force-push/deletion, no bypass actors) alongside the older `history` ruleset. Required checks: `build-and-audit` (GitHub Actions, integration 15368) and, since 2026-09-30, `Workers Builds: coltonbearden-com` (integration 85455). Both Workers Builds triggers build with `pnpm install --frozen-lockfile && pnpm run ci:build`, so a failing check, test, build or link check stops the deploy. **If Workers Builds is down or disconnected, every merge blocks**: recover by PUTting the ruleset without the Workers Builds check (`gh api -X PUT repos/coltonbearden/coltonbearden.com/rulesets/24262972` with the `{name,target,enforcement,bypass_actors,conditions,rules}` projection), then restore it.
- **Dependencies.** Dependabot (`.github/dependabot.yml`): weekly, grouped, npm in `site/` + github-actions. Semver-major updates are ignored for TypeScript (D19; `@astrojs/check` peers `^5 || ^6`) and for the framework/runtime (`astro`, `@astrojs/*`, `wrangler` — each major needs a decision row first, D26); dev-tool majors may land through grouped PRs when both required checks are green. If Dependabot runs sit queued-then-cancelled again (seen 2026-07-24 → 09-03, job label `dependabot`, no runner), check repo Settings → Code security → Dependabot runner setting before anything else.
- **Email:** Migadu. Primary mailbox `inbox@coltonbearden.com`; aliases `security@`, `dmarc@`, `tlsrpt@` forward to it.
  - MTA-STS — **closed.** `mode: enforce` / `max_age: 1209600` live since 2026-09-04 (PR #4, production deployment `155b3f72`); `_mta-sts` TXT (`25de991060c16900a13807a51fdd0b6a`) id bumped to `20260904T073853Z` after the policy was observed live. Any future policy change: edit the file, deploy, confirm via curl, then bump the id again.
  - DMARC — **one step left.** `p=quarantine` since 2026-09-04T07:38Z (record `d20df6dfa9f8a92b0b13608f4758df00`), after the user confirmed a clean `rua` window. `p=reject` follows after another clean window (earliest ~2026-09-18) with fresh user confirmation (D4).
- **Headers** — `site/public/_headers` sets nosniff, Referrer-Policy, Permissions-Policy, `X-Frame-Options: DENY` and an **enforced** CSP since 2026-09-30 (report-only first; a real-browser check of `/`, `/blog/001-orientation/` and `/contact/` showed zero violations with the edge-injected Web Analytics beacon and JavaScript Detections script). Its `script-src` carries `'unsafe-inline'` for the JSD inline script, so script protection is nominal; see D23 for what enforcement does buy. Any new asset or script origin needs a CSP change.
- **DNS snapshot:** `dns/records.json`, rewritten by `tools/dns/snapshot.mjs` and checked by `tools/dns/diff.mjs` (exit 1 on drift). After an intended DNS change, re-snapshot in the same PR (D28).
- **Phase 1 foundation tails:** scoped `Zone:DNS:Edit` Cloudflare API token → 1Password (Phase 1 plan Task 1); CAA issuance spot-check at the next Universal SSL renewal.
- **Cloudflare API access.** The MCP token can read/write DNS *records* and Workers *domains/deployments* fine, but returns 401/403 on zone *settings* (`dnssec`, `settings/ssl`, `settings/min_tls_version`, `settings/always_use_https`, `settings/automatic_https_rewrites`, `settings/security_header`) and 10000 auth errors on zone *rulesets* (redirect rules) and account RUM/Web Analytics APIs. Those limits belong to the MCP token: a full-scope API token held in the operator's automation lane (first used 2026-09-30) reads and writes Workers Builds triggers, zone rulesets (redirect rules), DNS records and the account name fine. With only the MCP token, zone settings, redirect rules and Web Analytics site management stay dashboard-manual — don't burn time retrying via API. A `PUT /accounts/{acct}` that echoes `settings` back returns error 1002 (`api_access_enabled` is enterprise-only) yet still applies the name; send `{id,name,type}` only. Registrar reads use `/accounts/{acct}/registrar/registrations/{domain}` (the older `registrar/domains` endpoints reached end of life 2026-09-27).
- Cloudflare error pages don't carry zone security headers (historical footgun from the pre-launch parking placeholder — kept for reference); if a request ever 5xx's, verify edge headers against `https://coltonbearden.com/cdn-cgi/trace` instead.
- `/.well-known/security.txt` (RFC 9116) is served from `site/public/.well-known/security.txt`, contact `security@coltonbearden.com`, **`Expires: 2027-09-01`** — refresh the date before then or the file becomes invalid.
- Resolvers show Cloudflare's auto-injected CAA `issue`/`issuewild` entries for its own CAs next to the zone's `issuewild ";"` — that is Universal SSL working as designed (the edge cert is a wildcard), not a regression of D6. The edge cert issued 2026-07-15 expires 2026-10-13; do the Phase 1 CAA spot-check at that renewal.
- This machine's `nslookup`/`Resolve-DnsName` cannot query CAA or DNSKEY record types. Use DNS-over-HTTPS (`curl "https://cloudflare-dns.com/dns-query?name=<name>&type=<type>" -H "accept: application/dns-json"`) or the Cloudflare API.

## Guardrails (from the decision log — do not silently violate)

- **Never delete or overwrite a DNS record without showing the exact before/after and getting explicit user go-ahead.** Several records are deliberate hardening baselines, not leftovers; the registry in `docs/domain/README.md` says which.
- **A new subdomain or new use of the domain gets a decision row (blueprint §10) and a registry line before any record is created** (D28).
- CAA `issuewild ";"` stays blocked (D6). Relaxing wildcards requires a new decision-log entry.
- HSTS `preload` stays **off** (D5, reaffirmed as D21) until the subdomains the domain will host exist and are stable; turning it on needs its own decision row.
- DMARC tightens one step at a time, each after a clean monitoring window and with user confirmation (D4).
- Personal ≠ commercial (D9, amended by D27): commercial or product use of this domain needs its own decision row.
- IDs stay in docs; account labels, personal emails, local paths and account security state don't (D24).

## Design lane

- **Design candidate A** — `docs/superpowers/specs/2026-07-15-severed-floor-design.md` (with the Season 1a plan that built its Surface). Its world rules — including **zero client JS on Surface pages** — bind candidate A only. It needs a replacement for its fictional corporation before it proceeds.
- `main` carries the interim look: candidate A's paper/memo visual system with plain personal-site copy.
- Candidates are prototyped on `design/<letter>-<name>` branches and compared via their Workers Builds preview URLs; the winner merges through the normal PR gate.
- Site-wide rules any candidate must meet: Lighthouse ≥ 0.95 in all four categories on every page; the deploy gate (both required checks, `ci:build`); the security headers and CSP (D23); Workers static assets delivery (D12). Cloudflare Web Analytics uses Automatic setup (edge-injected beacon for real browsers only) — do NOT add an analytics snippet; `curl`/CI never sees the beacon, and that's expected.
- Inspiration list: `docs/examples/design-examples.md`.

## Key documents

- `docs/specs/coltonbearden-com-blueprint.md` — original blueprint and the **decision log (§10)**. Blueprint body is reference context only; its assumptions were corrected during execution (e.g., primary mailbox is `inbox@`, not `colton@`).
- `docs/domain/README.md` — domain lane: registrar, hygiene principles, subdomain registry, email conventions, well-known files, DNS snapshot, use-case backlog.
- `docs/superpowers/plans/2026-07-14-coltonbearden-com-phase1-foundation.md` — Phase 1 (domain foundation) execution record: verified live zone state, DNS record IDs, per-task verification evidence. **Source of truth** for what was actually done there; where it and the blueprint disagree, trust the plan doc.
- `docs/superpowers/specs/2026-07-15-severed-floor-design.md` and `docs/superpowers/plans/2026-07-15-season1a-surface-platform.md` — design candidate A and the build of its Surface.

## Repository layout

- `site/` — the Astro site. `docs/specs/` — blueprint and decision log. `docs/superpowers/` — specs and plans (candidate A, Phase 1). `docs/domain/` — domain lane record. `dns/records.json` — committed DNS snapshot. `tools/dns/` — zero-dependency snapshot and drift tools.
- `cloudflare/` — **gitignored local reference**: a clone of `github.com/cloudflare/skills` (own `.git`) and an agents-SDK scratch install. Not project source; never commit it.

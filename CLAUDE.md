# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Infrastructure and planning repo for `coltonbearden.com` — Colton Bearden's personal-professional domain. There is **no application code yet**: no build, lint, or test commands exist. Phase 2 will scaffold an Astro site deployed to Cloudflare Pages; update this file with real commands when that lands.

## Phases and current state

Four-phase plan: **F** Foundation → **P** Presence → **C** Commercial → **I** Infra (optional).

- **Phase 1 (Foundation) — complete** (2026-07-14), with three open tails:
  - Scoped `Zone:DNS:Edit` Cloudflare API token → 1Password (plan Task 1).
  - DMARC ramp `p=none → quarantine → reject` after clean `rua` monitoring windows (plan Task 10).
  - CAA issuance spot-check at the next Universal SSL renewal.
- **Phase 2 (Presence) — not started.** Astro + Cloudflare Pages, apex-canonical (`www` → apex 301), MTA-STS policy endpoint (closes a Phase 1 deferral).
- **Phases 3–4 — deferred/conditional.** Do not build speculatively.

## Key documents

- `docs/superpowers/plans/2026-07-14-coltonbearden-com-phase1-foundation.md` — Phase 1 execution record: verified live zone state, DNS record IDs, per-task verification evidence. **Source of truth** for what was actually done.
- `docs/specs/coltonbearden-com-blueprint.md` — design blueprint. **Reference context only**; its assumptions were corrected during execution (e.g., primary mailbox is `inbox@`, not `colton@`). Where the two disagree, trust the plan doc.

## Operational facts (verified live 2026-07-14)

- Zone `coltonbearden.com`: zone_id `bc9faf24541428e9ed5f3687d9ede3ef`, account `9a06f3b33d177e286938eec3240c6679`.
- Email: Migadu. Primary mailbox `inbox@coltonbearden.com`; aliases `security@`, `dmarc@`, `tlsrpt@` forward to it.
- **Cloudflare MCP permission gap:** the MCP token can read/write DNS *records* but returns 401/403 on zone *settings* (`dnssec`, `settings/ssl`, `settings/min_tls_version`, `settings/always_use_https`, `settings/automatic_https_rewrites`, `settings/security_header`). Zone-setting changes are dashboard-manual — don't burn time retrying via API.
- Apex A record is an RFC 5737 parking placeholder, so `https://coltonbearden.com` returns **522 by design** until Phase 2. Cloudflare error pages don't carry zone security headers — verify edge headers against `https://coltonbearden.com/cdn-cgi/trace` instead.
- This machine's `nslookup`/`Resolve-DnsName` cannot query CAA or DNSKEY record types. Use DNS-over-HTTPS (`curl "https://cloudflare-dns.com/dns-query?name=<name>&type=<type>" -H "accept: application/dns-json"`) or the Cloudflare API.

## Guardrails (from the decision log — do not silently violate)

- **Never delete or overwrite a DNS record without showing the exact before/after and getting explicit user go-ahead.** Several records are deliberate hardening baselines, not leftovers.
- CAA `issuewild ";"` stays blocked (D6). Relaxing wildcards requires a new decision-log entry.
- HSTS `preload` stays **off** (D5) until the full HTTPS footprint (Pages + `mta-sts.` subdomain) is stable.
- DMARC tightens one step at a time, each after a clean monitoring window and with user confirmation (D4).
- Commercial/product work likely belongs on a FirstCast-branded domain, not this one (D9).

## Repository layout

- `docs/specs/` — design blueprints. `docs/superpowers/plans/` — implementation plans and execution records.
- `cloudflare/` — **gitignored local reference**: a clone of `github.com/cloudflare/skills` (own `.git`) and an agents-SDK scratch install. Not project source; never commit it.

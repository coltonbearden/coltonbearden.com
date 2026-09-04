# coltonbearden.com — Personal-Professional Domain Blueprint

> **Intended repo path:** `docs/specs/coltonbearden-com-blueprint.md` (site/infra repo). No git here — this shared file is the record; commit it yourself.
>
> **Status:** Design approved (sequence + email pinned). Ready for implementation planning.
> **Date:** 2026-07-14
> **Owner:** Colton Bearden (FirstCastSolutions)
> **Registrar/DNS:** Cloudflare (zone live)

---

## 1. Executive Summary

`coltonbearden.com` is your personal-professional identity anchor, built as a **blend** and sequenced **foundation-first**. Four clusters, three real build tracks + one optional:

| Cluster | Purpose | Phase | Effort | Gate |
|---|---|---|---|---|
| **F · Foundation** | Zone hardening + professional email (`inbox@`) | 1 | Low | — |
| **P · Presence** | Astro site on Cloudflare Pages: landing, portfolio, blog, analytics | 2 | Med | F done |
| **C · Commercial** | Front door for the Claude Code plugin platform (marketing → docs → signup → billing) | 3 | High | P done **+** platform sellable |
| **I · Infra** *(optional)* | Cloudflare Tunnel + Zero Trust → homelab subdomains/API | 4 | Med | Triggered by C needing a public API, or selective service exposure |

**Sequencing rationale:** F and P deliver value *unconditionally* — a professional email and a credible presence are useful regardless of which venture wins. F also front-loads the highest-blast-radius, slowest-to-fix pieces (DNS/email). P becomes the shell C later slots into → zero rework. I stays optional because Tailscale already covers private access; it earns its place only when there's a *public* reason.

**Near-term cost:** ~$30/yr all-in (domain renewal ~$10 + Migadu ~$19 + Pages/Analytics free). See §8.

---

## 2. Architecture Overview

```mermaid
flowchart TD
    D[coltonbearden.com<br/>registered @ Cloudflare] --> CF[Cloudflare Zone<br/>DNSSEC · CAA · TLS · HSTS]
    CF -->|MX / SPF / DKIM / DMARC| MG[Migadu<br/>inbox@coltonbearden.com]
    CF -->|apex + www| PG[Cloudflare Pages<br/>Astro · blog · Web Analytics]
    CF -.->|Phase 3| CM[Commercial front door<br/>marketing · docs · signup · billing]
    CF -.->|Phase 4 · optional| TN[Cloudflare Tunnel + Zero Trust<br/>subdomains → homelab]
    PG -.->|later contains| CM
    TN -.-> HL[(Homelab · 6 machines)]

    classDef built fill:#1f6feb,stroke:#0d1117,color:#fff;
    classDef future fill:#30363d,stroke:#0d1117,color:#c9d1d9,stroke-dasharray:4 3;
    class CF,MG,PG built;
    class CM,TN,HL future;
```

Solid = Phase 1–2 (build now). Dotted = Phase 3–4 (conditional/deferred).

---

## 3. Phase 1 · Foundation (F) — *executable now*

### F1 · Zone hardening

| Item | Setting | Note |
|---|---|---|
| DNSSEC | **Enable** (CF one-click) | Registrar *is* Cloudflare → DS record auto-published, fully hands-off. Verify status = **Active**. |
| CAA | Add 5 records | `0 issue "letsencrypt.org"` · `0 issue "pki.goog"` · `0 issue "ssl.com"` · `0 issuewild ";"` (block wildcards — relax later if you need a `*.` cert for many subdomains) · `0 iodef "mailto:security@coltonbearden.com"` |
| SSL/TLS mode | **Full (Strict)** | Automatic once on Pages. |
| Minimum TLS | **1.2** | 1.3 negotiated when available. |
| HTTPS | Always Use HTTPS **on** + Automatic HTTPS Rewrites **on** | |
| HSTS | Enable, `max-age=31536000`, `includeSubDomains` | **Defer `preload`** until every subdomain is HTTPS-stable — preload is hard to reverse. |

### F2 · Professional email (Migadu)

Sign up Migadu → add `coltonbearden.com` → create `inbox@` mailbox. Publish:

| Record | Type | Value |
|---|---|---|
| MX (pri 10) | MX | `aspmx1.migadu.com` |
| MX (pri 20) | MX | `aspmx2.migadu.com` |
| SPF | TXT `@` | `v=spf1 include:spf.migadu.com -all` |
| DKIM 1 | CNAME `key1._domainkey` | `key1.coltonbearden.com._domainkey.migadu.com` |
| DKIM 2 | CNAME `key2._domainkey` | `key2.coltonbearden.com._domainkey.migadu.com` |
| DKIM 3 | CNAME `key3._domainkey` | `key3.coltonbearden.com._domainkey.migadu.com` |
| Ownership | TXT `@` | `hosted-email-verify=…` (token from Migadu dashboard) |
| DMARC | TXT `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@coltonbearden.com; fo=1; adkim=s; aspf=s` |
| TLS-RPT | TXT `_smtp._tls` | `v=TLSRPTv1; rua=mailto:tlsrpt@coltonbearden.com` |
| Autoconfig *(opt)* | CNAME `autoconfig` | `autoconfig.migadu.com` (client auto-setup) |

**DMARC ramp:** start `p=none` (monitor `rua` ~1–2 weeks) → `p=quarantine` → `p=reject`. Greenfield domain = no legacy senders to break, so you can jump to `quarantine` early if reports are clean. Migadu doesn't parse DMARC reports — point `rua` at the `dmarc@` mailbox, or a free monitor (URIports / Postmark DMARC) for readable digests.

> **MTA-STS** (stronger downgrade protection) needs an HTTPS-served policy at `https://mta-sts.coltonbearden.com/.well-known/mta-sts.txt` → **deferred to Phase 2** once Pages exists (or a 10-line Worker). TLS-RPT above is just a TXT and ships now.

### Phase 1 acceptance criteria

- [ ] DNSSEC shows **Active** in Cloudflare; `dig coltonbearden.com DNSKEY` returns keys.
- [ ] `dig coltonbearden.com CAA` returns the 5 records; test cert issuance still succeeds.
- [ ] Send **and** receive a test message from `inbox@coltonbearden.com`.
- [ ] [mail-tester.com](https://www.mail-tester.com) ≥ **9/10**; SPF + DKIM + DMARC all **pass** at a Gmail/Outlook recipient (check "show original" headers).
- [ ] `curl -sI https://coltonbearden.com` shows `strict-transport-security` header (no `preload` token yet).
- [ ] After monitoring: DMARC tightened to at least `p=quarantine`.

---

## 4. Phase 2 · Presence (P) — *well-specified, build after F*

### Stack decision → **Astro + Cloudflare Pages**

Rationale: content-first, islands architecture ships **zero JS by default** (top Lighthouse), type-safe **content collections** for the blog, huge theme ecosystem, and Pages is native to your Cloudflare setup (free tier, Git-integrated CI, preview deploys on PRs). Alternatives rejected: Next.js (heavier; app-like features you don't need for a presence site), Hugo (fast but weaker component DX for a JS/TS dev), Workers+framework (needless complexity). See D3.

### Information architecture

| Route | Purpose |
|---|---|
| `/` | Hero — who you are, what you do (FirstCastSolutions, homelab, dev). Clear CTA. |
| `/about` | Longer bio, focus areas, contact. |
| `/work` (or `/projects`) | Curated builds — plugin platform, homelab, notable repos. Cards → external/GitHub. |
| `/blog` | Astro content collection (MD/MDX). Seeds the C funnel + SEO. |
| `/uses` *(opt)* | Your toolchain (workstation, homelab, WezTerm/oh-my-posh, yt-dlp stack). Devs love a `/uses`. |
| `/contact` | `inbox@` + socials. |

### Delivery

- **Repo → Pages Git integration:** auto-deploy on push to `main`; preview deploy per PR. Matches your Conventional Commits + squash-merge workflow.
- **Custom domain:** apex + `www` → Pages project (CNAME flattening at apex, handled by CF).
- **Analytics:** Cloudflare **Web Analytics** (free, cookieless, privacy-friendly) — add the beacon snippet.
- **MTA-STS:** host the policy file here (`mta-sts.` subdomain → a Pages project or Worker serving `/.well-known/mta-sts.txt`, mode `testing` → `enforce`). Closes the Phase 1 deferral.

### Phase 2 acceptance criteria

- [ ] `main` push triggers a Pages deploy; PR opens a preview URL.
- [ ] apex + `www` resolve over HTTPS with valid cert; **apex is canonical**, `www` → apex 301 enforced via a Redirect Rule.
- [ ] All IA routes render; Lighthouse ≥ 95 across Performance/Best-Practices/SEO on the landing page.
- [ ] Web Analytics receiving pageviews.
- [ ] First blog post published (content engine seeded).
- [ ] MTA-STS policy served over HTTPS; mode `enforce`.

---

## 5. Phase 3 · Commercial (C) — *outlined; detail when platform nears sellable*

Sub-phaseable front door for the monetized Claude Code plugin platform. **Trigger to start: the platform is weeks from being sellable.**

**Build order within C:** marketing/landing → docs → waitlist/signup → billing.

**Deferred decisions (resolve at C kickoff):**

| ID | Decision | Lean |
|---|---|---|
| C-D1 | **Location** — product on the personal domain vs a FirstCastSolutions-branded surface | Lean: keep product on a `firstcastsolutions.*` domain; coltonbearden.com *links* to it (or hosts a thin `/firstcast` marketing page). Keeps personal ≠ commercial identity clean. |
| C-D2 | **Billing** — Stripe vs Merchant-of-Record (Polar.sh / Lemon Squeezy) | Lean: **Merchant-of-Record** — as a solo dev selling globally, MoR offloads VAT/sales-tax compliance. Evaluate Polar (dev-first) vs Lemon Squeezy. |
| C-D3 | **Docs engine** | Lean: **Astro Starlight** — stays in the Phase 2 ecosystem (shared components/design). Alts: Mintlify, Docusaurus. |
| C-D4 | **Auth model** — license keys vs accounts | Depends on product packaging; defer until packaging is fixed. |

**Acceptance (per sub-phase):** marketing page live + waitlist capturing emails → docs indexed and searchable → signup issues a working license/account → a real test transaction settles and provisions access.

---

## 6. Phase 4 · Infra (I) — *optional; do not build speculatively*

Cloudflare **Tunnel** (`cloudflared`) from the homelab + **Zero Trust Access** policies (email OTP or IdP), exposing *specific* services on subdomains.

**Triggers (build only when one is true):**
1. C needs a **public API endpoint** (e.g., the plugin platform's backend, or a vLLM OpenAI-compatible surface for tenants) → `api.coltonbearden.com` (or on the FirstCast domain per C-D1).
2. You want to expose a **single** service publicly with auth (status page, demo, dashboard).

**Guardrails (you weight these as highly as capability):**
- Expose **per-service**, never the whole network. One tunnel ingress rule per hostname.
- Keep **Tailscale as the admin/management plane** — Tunnel is for public, authenticated, single-purpose exposure only.
- Zero Trust Access policy in front of every non-public hostname; default-deny.
- If a wildcard cert becomes necessary here, relax the Phase 1 `issuewild` CAA deliberately (D-log it).

---

## 7. Cross-Cutting Concerns

**Secrets (1Password):**
- Create a **scoped Cloudflare API token** — permissions `Zone:DNS:Edit` limited to *this zone only* (not the global key). Store in 1Password. This unblocks automation/IaC without over-privileging.
- Store Migadu admin creds + app passwords in 1Password.

**Infrastructure-as-Code (recommended, not Phase-1-blocking):**
- Bootstrap the zone manually in Phase 1; once records stabilize, **import the zone into OpenTofu/Terraform** (Cloudflare provider) and version it alongside your homelab-state repo. YAGNI on day 1 — but managing DNS as code fits your IaC discipline and makes future changes reviewable via PR. D-log the cutover when you do it.

**Observability:** Web Analytics (P) for the site; DMARC `rua` + TLS-RPT for mail; add funnel/conversion tracking at C.

---

## 8. Cost Summary

| Item | Cost | Phase |
|---|---|---|
| Domain renewal | ~$10/yr | (paid) |
| Migadu (flat, multi-domain) | ~$19/yr | 1 |
| Cloudflare Pages | Free | 2 |
| Cloudflare Web Analytics | Free | 2 |
| Astro Starlight docs | Free | 3 |
| Billing provider (MoR) | ~5% + fees / txn | 3 |
| Cloudflare Tunnel + Zero Trust (free tier ≤ 50 users) | Free | 4 |
| **Near-term total (Phases 1–2)** | **~$30/yr** | |

---

## 9. Prioritized Action Items (highest value first)

**Phase 1 — Foundation**
1. Create scoped Cloudflare API token (`Zone:DNS:Edit`, this zone) → 1Password.
2. Enable DNSSEC → verify **Active**.
3. Add the 5 CAA records.
4. Sign up Migadu, add `coltonbearden.com`, create `inbox@` mailbox.
5. Publish MX + SPF + 3× DKIM CNAMEs + ownership TXT.
6. Publish DMARC (`p=none`) + TLS-RPT.
7. Set SSL Full (Strict), Min TLS 1.2, Always Use HTTPS, HSTS (no preload), optional autoconfig CNAME.
8. Send/receive test → mail-tester ≥ 9 → confirm SPF/DKIM/DMARC green at Gmail.
9. Monitor DMARC `rua` ~1–2 wks → tighten to `quarantine` → `reject`.

**Phase 2 — Presence**
10. Scaffold Astro site; init repo (Conventional Commits); connect Cloudflare Pages Git integration; point apex + `www`.
11. Build IA (`/`, `/about`, `/work`, `/blog`, `/uses`, `/contact`); add Web Analytics; enforce apex-canonical (`www` → apex 301).
12. Stand up `mta-sts.` policy endpoint → MTA-STS `enforce` (closes Phase 1 deferral).
13. Publish first blog post (seed content engine).

**Phase 3 — Commercial** *(trigger: platform nears sellable)*
14. Resolve C-D1…C-D4 (location, billing/MoR, docs engine, auth); build marketing → docs → waitlist → billing.

**Phase 4 — Infra** *(trigger: public API/service needed)*
15. `cloudflared` tunnel + Zero Trust Access, per-service exposure; Tailscale stays the admin plane.

---

## 10. Decisions Log (DECISIONS.md-style)

| ID | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| D1 | Sequence = **A** (F→P→C→I) | F/P deliver unconditional value; F de-risks highest-blast-radius pieces; P is the shell C reuses (zero rework); I optional given Tailscale | B product-forward (product not yet sellable → coming-soon launch), C infra-forward (front-loads ops/attack surface with no public reason) |
| D2 | Email = **Migadu** | Flat pricing covers coltonbearden.com + a future FirstCast domain with no per-mailbox tax; dev-friendly | Fastmail (pricier for multi-domain), Google Workspace (overkill/pricey), Cloudflare Email Routing (receive-only, sending needs a relay), self-host (residential-IP deliverability loss) |
| D3 | Presence stack = **Astro + Cloudflare Pages** | Zero-JS default, content collections, native to CF, Git CI + preview deploys | Next.js (heavier), Hugo (weaker component DX for JS/TS dev), Workers+framework (needless complexity) |
| D4 | DMARC ramp `none → quarantine → reject` | Observe alignment before enforcing; greenfield allows early tightening | Immediate `reject` (risks silently dropping legit mail before verification) |
| D5 | HSTS `preload` **deferred** | Preload is hard to reverse; enable only after full HTTPS footprint is stable | Preload from day 1 (locks in an incomplete footprint) |
| D6 | CAA `issuewild ";"` (block wildcards) | No wildcard need yet; reduces mis-issuance surface | Permit wildcards pre-emptively |
| D7 | Cloudflare API token **scoped**, not global key | Least privilege; safe to store/automate | Global API key (over-privileged) |
| D8 | IaC (OpenTofu) **after** stabilization, not Phase 1 | YAGNI on day 1; import once records settle | IaC-first (slows the fast, low-risk Phase 1) |
| D9 | Commercial likely on a **FirstCast-branded** surface, not the personal domain | Keeps personal ≠ commercial identity clean | Product directly on coltonbearden.com |
| D10 | Primary mailbox = **`inbox@coltonbearden.com`**, not `colton@` | User's deliberate choice made during Phase 1 execution (2026-07-14) | `colton@coltonbearden.com` (this doc's original assumption throughout) |
| D16 | Repo **public** under `coltonbearden/coltonbearden.com`; site links point at `github.com/coltonbearden` (2026-09-03) | /work copy says "built in public"; after the 2026-08-22 transfer the repo had gone private and the link 404'd for visitors | Keep private and link the profile only; keep private and leave a dead repo link |
| D17 | MTA-STS **`enforce`**, `max_age: 1209600`; TXT id bumped only after the policy is observed live (2026-09-04) | 20 Google TLS-RPT reports 2026-07-15 → 08-25: 32 sessions, 0 failures; enforce eligible since 07-29 | Stay in `testing` longer; bump the id before the deploy (senders would cache the old policy) |
| D18 | DMARC `p=none → quarantine` (2026-09-04); `p=reject` only after a fresh clean window with new confirmation | D4 one-step-at-a-time; user confirmed a clean `rua` window 07-14 → 09-03 | Jump straight to `reject` |
| D19 | Dependabot config: weekly, grouped npm (`site/`) + github-actions; **TypeScript semver-major ignored** | Runs had been stuck queued since 07-24; `astro check` refuses TS 7 (`@astrojs/check` peer `^5 \|\| ^6`) | Security-only Dependabot; manual periodic updates |
| D20 | Dependency refresh stays **in range** (astro 7.2.x, wrangler 4.128.x, TS 6.x); `packageManager` pinned to `pnpm@11.25.0` | pnpm's supply-chain policy held back same-day astro 7.3.x / wrangler 4.129.0; pnpm/action-setup v6 rejects 11.13.0 as a broken release | Force day-old releases via overrides; vitest 5 major; TS 7 |
| D21 | HSTS `preload` stays **off** (reaffirms D5) although the full-HTTPS precondition is now met | S1b/S1c will add Tunnel-fronted subdomains; preload is effectively one-way | Preload now |

---

*End of blueprint.*

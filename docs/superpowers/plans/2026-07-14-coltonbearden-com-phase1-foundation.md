# coltonbearden.com — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the live `coltonbearden.com` Cloudflare zone (DNSSEC, CAA, TLS, HSTS) and stand up professional email (`inbox@coltonbearden.com` via Migadu — see D10, primary mailbox changed from the blueprint's original `colton@` assumption during execution), per `blueprint.md` §3 (Phase 1 · Foundation).

**Architecture:** Two workstreams executed together because they share one gate (`P` cannot start until `F` is fully done): **F1 zone hardening** (DNSSEC, CAA, SSL/TLS mode, HSTS — all Cloudflare zone *settings*) and **F2 email** (Migadu mailbox + supporting DNS records). This plan adapts the usual code/TDD task template to infrastructure: "Files" becomes "Cloudflare resource," "run the test" becomes "run the verification command," and "commit" becomes "check the box in this file" (there is no code repo here yet — see Global Constraints).

**Tech Stack:** Cloudflare (DNS, DNSSEC, SSL/TLS, CAA) via the `mcp__cloudflare__execute` MCP tool for DNS-*record*-level changes, and the Cloudflare dashboard for zone-*setting*-level changes (permission gap confirmed below). Migadu for mailbox hosting.

**Scope note:** This plan covers **Phase 1 only**. Phase 2 (Presence/Astro/Pages) is gated on Phase 1's acceptance criteria passing (blueprint §1 gate table) and will get its own plan once F is done — planning it now would violate the blueprint's own sequencing rationale (D1) and YAGNI (D8).

## Global Constraints

- Zone: `coltonbearden.com` — zone_id `bc9faf24541428e9ed5f3687d9ede3ef`, account `9a06f3b33d177e286938eec3240c6679` ("It@firstcastsolutions.com's Account"). Verified live 2026-07-14 via Cloudflare MCP `GET /zones?name=coltonbearden.com`.
- **Permission gap (confirmed live 2026-07-14):** the connected Cloudflare MCP token can read/write DNS records (`GET`/`POST`/`PUT /zones/{id}/dns_records` all succeeded) but **cannot** read or write `dnssec`, `settings/ssl`, `settings/min_tls_version`, `settings/automatic_https_rewrites`, `settings/always_use_https`, or `settings/security_header` (all returned `401`/`403`). Every task touching those settings is marked **[MANUAL — Dashboard]** below; I cannot execute or verify them via API with the current token.
- Never delete or overwrite a DNS record without showing the exact before/after to the user and getting explicit go-ahead first — several existing records are intentional anti-spoofing placeholders, not accidents (see Current State).
- CAA `issuewild` stays blocked (`;`) per D6 — do not permit wildcards without a separate decision-log entry.
- HSTS `preload` stays **off** per D5 until the full HTTPS footprint (incl. Phase 2 Pages + the `mta-sts.` subdomain) is stable.
- DMARC ramp is `p=none → p=quarantine → p=reject` per D4, monitoring `rua` reports 1–2 weeks between steps.

---

## Current State (verified live 2026-07-14 via Cloudflare MCP — read-only, nothing changed)

DNS records that already exist on the zone:

| ID | Type | Name | Content | Comment |
|---|---|---|---|---|
| `415158cc70fc5b1ef3b20ae42d530dbe` | A | `coltonbearden.com` | `192.0.2.1` (proxied) | Parking placeholder (RFC 5737 TEST-NET-1) |
| `6ed5bfb8cc3e988c226fb75e886eb055` | CNAME | `www.coltonbearden.com` | `coltonbearden.com` (proxied) | Parking placeholder — www follows apex |
| `e0df484683d50dfc59b1c9c359af5641` | TXT | `coltonbearden.com` | `v=spf1 -all` | Non-sender SPF — no authorized senders |
| `d20df6dfa9f8a92b0b13608f4758df00` | TXT | `_dmarc.coltonbearden.com` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | Non-sender DMARC — reject spoofed mail |
| `1a9b33ea112e6d58c170e9331c4013ee` | TXT | `*._domainkey.coltonbearden.com` | `v=DKIM1; p=` | All DKIM keys revoked (non-sender) |

No CAA records exist. No MX records exist.

**What this means for the plan:**
- The apex `A` and `www` `CNAME` are Phase 2 concerns (Pages custom domain) — this plan does not touch them.
- The SPF and DMARC TXT records are a deliberate "nobody sends mail from this domain yet" hardening baseline, not leftovers. Task 6 below **replaces** them with real values — that's a meaningful loosening (DMARC literally goes from `p=reject` to `p=none`), so it gets an explicit confirmation checkpoint, not a silent overwrite.
- The wildcard `*._domainkey` revoke record is **not** in conflict with Migadu's specific `key1`/`key2`/`key3._domainkey` selectors (exact-name DNS answers win over wildcards), so it's left in place — it continues to block any DKIM selector Migadu isn't using.

---

### Task 1: Scoped Cloudflare API token for durable automation [MANUAL]

Blueprint §9 item 1. The interactive MCP session already lets me edit DNS records, but the blueprint calls for a standalone `Zone:DNS:Edit` token in 1Password (D7) so automation/IaC work later (D8) doesn't depend on this chat session.

- [ ] Cloudflare dashboard → profile icon → **My Profile → API Tokens → Create Token** → template **"Edit zone DNS"** → Zone Resources: **Specific zone → coltonbearden.com** → Continue to summary → Create Token → copy the value (shown once).
- [ ] Store it in 1Password (adjust `<vault>` to your vault name):
  ```powershell
  op item create --category="API Credential" --title="Cloudflare - coltonbearden.com DNS Edit" --vault=<vault> "credential=<paste-token>" "notesPlain=Zone:DNS:Edit scoped to coltonbearden.com (zone bc9faf24541428e9ed5f3687d9ede3ef), created 2026-07-14"
  ```
- [ ] Confirm it works:
  ```powershell
  curl.exe -s -H "Authorization: Bearer <paste-token>" "https://api.cloudflare.com/client/v4/zones/bc9faf24541428e9ed5f3687d9ede3ef/dns_records" | jq '.success'
  ```
  Expected: `true`

---

### Task 2: Enable DNSSEC [MANUAL — Dashboard]

- [x] Cloudflare dashboard → `coltonbearden.com` zone → **DNS → Settings** tab → **DNSSEC → Enable DNSSEC**. (Enabled via dashboard during first execution session, 2026-07-14.)
- [x] Because Cloudflare is also the registrar, the DS record is auto-published — no separate registrar step. (DS confirmed published at parent.)
- [x] Wait for the dashboard to show status **Active** (can take a few hours for DS propagation). (Propagated by 2026-07-14 evening.)

Verification:
- [x] Verified 2026-07-14 via DNS-over-HTTPS (local `nslookup` doesn't support DNSKEY query type — same Windows DNS-client limitation as CAA in Task 3; use `curl "https://cloudflare-dns.com/dns-query?name=coltonbearden.com&type=DNSKEY" -H "accept: application/dns-json"`): 2 DNSKEY records, 1 DS at parent, and **`AD: true`** — a validating resolver authenticates the full chain, which is stronger evidence than the dashboard badge.
- [x] Dashboard status implied Active by the validating-chain result above; eyeball it next time the dashboard is open.

---

### Task 3: Add the 5 CAA records [Cloudflare MCP — confirm before applying]

Target (blueprint §3 F1), confirmed via live API that zero CAA records currently exist:

```
0 issue "letsencrypt.org"
0 issue "pki.goog"
0 issue "ssl.com"
0 issuewild ";"
0 iodef "mailto:security@coltonbearden.com"
```

Note: `security@coltonbearden.com` doesn't exist yet as an inbox — Task 5 creates it as an alias. CAA still enforces issuance restrictions even before that alias exists; only the violation-report delivery is delayed.

- [x] Ran via `mcp__cloudflare__execute` after explicit user confirmation (2026-07-14). All 5 created successfully:

  | tag | value | record id |
  |---|---|---|
  | issue | letsencrypt.org | `a008c9e6116a3ddff35dd2aa4e6c9280` |
  | issue | pki.goog | `3aa1333040690b2affbcf3af86c6c509` |
  | issue | ssl.com | `693030de1e9e50372a915bf1727cf668` |
  | issuewild | ; | `106e693ea737dd6aab02e112cf065aff` |
  | iodef | mailto:security@coltonbearden.com | `bb646377f9ea5950a641b45d3787ad00` |

Verification:
- [x] Confirmed via `GET /zones/{id}/dns_records?type=CAA` — all 5 present and correct (2026-07-14). Note: this machine's `nslookup`/`Resolve-DnsName` don't support CAA queries — the Windows DNS client here has no CAA record-type support, so use the Cloudflare API or an external checker (e.g. dnschecker.org) for future CAA verification instead of local tools.

---

### Task 4: Migadu signup, domain, mailbox [MANUAL]

Requires account creation + billing — not something to automate on the user's behalf.

- [ ] Sign up at Migadu, add `coltonbearden.com` as a domain.
- [x] Create mailbox `inbox@coltonbearden.com` (D10 — user chose `inbox@` over the blueprint's original `colton@` assumption).
- [ ] From Migadu's domain setup screen, capture the **ownership verification token** (`hosted-email-verify=…`) — needed verbatim in Task 6.
- [ ] Cross-check Migadu's shown MX/DKIM records against the blueprint's expected values (`aspmx1.migadu.com` / `aspmx2.migadu.com` priorities 10/20, DKIM selectors `key1`/`key2`/`key3`) — Migadu's setup screen is the source of truth if anything differs from blueprint §3 F2's table.

---

### Task 5: Migadu aliases for report addresses [MANUAL]

**Gap found while planning:** the blueprint's DNS records (Task 3 CAA `iodef`, Task 6 DMARC `rua`, Task 6 TLS-RPT `rua`) reference `security@`, `dmarc@`, and `tlsrpt@coltonbearden.com`, but §3 F2 only instructs creating one mailbox (originally `colton@`, now `inbox@` per D10). Without these existing, CAA violation reports, DMARC aggregate reports, and TLS-RPT reports will bounce silently.

- [x] **Status: complete (2026-07-14).** Created aliases `security@`, `dmarc@`, `tlsrpt@` in Migadu, forwarding to `inbox@coltonbearden.com`.

---

### Task 6: Publish email DNS records — replaces existing SPF/DMARC [Cloudflare MCP — confirm before applying]

**Checkpoint before running this task:** this updates the existing SPF TXT record (`e0df484683d50dfc59b1c9c359af5641`) from `v=spf1 -all` to a real permissive SPF, and updates the existing DMARC TXT record (`d20df6dfa9f8a92b0b13608f4758df00`) from `p=reject` to `p=none`. Both are deliberate loosenings of an intentionally locked-down zone. Show the user the exact before/after and get a go-ahead before executing — do not run this as part of a larger batch without that confirmation.

Fill `<MIGADU_OWNERSHIP_TOKEN>` from Task 4 before running.

**Status: complete (2026-07-14).** Actual ownership token: `lz5dhmpu`. The user added most of these records manually via the Cloudflare dashboard before this task ran; two errors were caught and fixed:
- `key2._domainkey` CNAME target was missing `.com` (`key2.coltonbearden.com._domainkey.migadu` instead of `...migadu.com`) — a broken DKIM selector. Fixed via `PUT` to record `b7395d314fc0f0b48515e7fbdb27b098`.
- `autoconfig` CNAME was proxied (orange cloud) instead of DNS-only — proxying a third-party mail-provider CNAME target risks a Host-header/SNI mismatch at Migadu's edge. Fixed via `PUT` to record `10958dfc6a25851b66578e84564bce8c`, `proxied: false`.

SPF and DMARC were replaced via `PUT` after explicit user confirmation. Final verified state (2026-07-14):
- MX ×2: `aspmx1.migadu.com` (10), `aspmx2.migadu.com` (20)
- DKIM CNAMEs ×3: `key1`/`key2`/`key3._domainkey` → `keyN.coltonbearden.com._domainkey.migadu.com`, all `proxied: false`
- SPF: `v=spf1 include:spf.migadu.com -all`
- DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@coltonbearden.com; fo=1; adkim=s; aspf=s`
- Ownership TXT: `hosted-email-verify=lz5dhmpu`
- TLS-RPT: `v=TLSRPTv1;rua=mailto:tlsrpt@coltonbearden.com`
- Autoconfig CNAME → `autoconfig.migadu.com`, `proxied: false`

- [x] Execute via `mcp__cloudflare__execute`: *(superseded — records landed via dashboard + two MCP `PUT` fixes per the status note above; script kept for reference)*
  ```javascript
  async () => {
    const zoneId = "bc9faf24541428e9ed5f3687d9ede3ef";
    const out = {};

    // Update in place: SPF (was "v=spf1 -all")
    out.spf = await cloudflare.request({
      method: "PUT",
      path: `/zones/${zoneId}/dns_records/e0df484683d50dfc59b1c9c359af5641`,
      body: { type: "TXT", name: "coltonbearden.com", content: "v=spf1 include:spf.migadu.com -all" },
    });

    // Update in place: DMARC (was "p=reject"; ramping to "p=none")
    out.dmarc = await cloudflare.request({
      method: "PUT",
      path: `/zones/${zoneId}/dns_records/d20df6dfa9f8a92b0b13608f4758df00`,
      body: { type: "TXT", name: "_dmarc.coltonbearden.com", content: "v=DMARC1; p=none; rua=mailto:dmarc@coltonbearden.com; fo=1; adkim=s; aspf=s" },
    });

    // New records
    const news = [
      { type: "MX", name: "coltonbearden.com", content: "aspmx1.migadu.com", priority: 10 },
      { type: "MX", name: "coltonbearden.com", content: "aspmx2.migadu.com", priority: 20 },
      { type: "CNAME", name: "key1._domainkey.coltonbearden.com", content: "key1.coltonbearden.com._domainkey.migadu.com", proxied: false },
      { type: "CNAME", name: "key2._domainkey.coltonbearden.com", content: "key2.coltonbearden.com._domainkey.migadu.com", proxied: false },
      { type: "CNAME", name: "key3._domainkey.coltonbearden.com", content: "key3.coltonbearden.com._domainkey.migadu.com", proxied: false },
      { type: "TXT", name: "coltonbearden.com", content: "hosted-email-verify=<MIGADU_OWNERSHIP_TOKEN>" },
      { type: "TXT", name: "_smtp._tls.coltonbearden.com", content: "v=TLSRPTv1; rua=mailto:tlsrpt@coltonbearden.com" },
      { type: "CNAME", name: "autoconfig.coltonbearden.com", content: "autoconfig.migadu.com", proxied: false },
    ];
    out.created = [];
    for (const r of news) {
      const res = await cloudflare.request({ method: "POST", path: `/zones/${zoneId}/dns_records`, body: r });
      out.created.push({ ok: res.success, id: res.result?.id, type: r.type, name: r.name });
    }
    return out;
  }
  ```
- [x] Confirm `out.spf.success`, `out.dmarc.success`, and every entry in `out.created` are `true`. *(superseded — final state verified via `GET`, see status note)*

Verification (all run against 1.1.1.1, second execution session 2026-07-14):
- [x] `nslookup -type=MX coltonbearden.com 1.1.1.1` → both `aspmx1` (10) / `aspmx2.migadu.com` (20). ✓
- [x] `nslookup -type=TXT coltonbearden.com 1.1.1.1` → `v=spf1 include:spf.migadu.com -all` + `hosted-email-verify=lz5dhmpu`. ✓
- [x] `nslookup -type=TXT _dmarc.coltonbearden.com 1.1.1.1` → `p=none` with `rua=mailto:dmarc@`. ✓ (TLS-RPT at `_smtp._tls` also confirmed.)
- [x] `nslookup -type=CNAME keyN._domainkey.coltonbearden.com 1.1.1.1` → all three resolve to `keyN.coltonbearden.com._domainkey.migadu.com` (key2 fix confirmed live). ✓

---

### Task 7: SSL/TLS zone settings [MANUAL — Dashboard]

Cannot be done via the current Cloudflare MCP token (confirmed `401`/`403` on all of these in Current State research).

- [x] Dashboard → `coltonbearden.com` → **SSL/TLS → Overview** → set encryption mode to **Full (Strict)**. (User confirmed in dashboard 2026-07-14 — not externally verifiable while origin is the parking placeholder.)
- [x] **SSL/TLS → Edge Certificates** → **Minimum TLS Version → TLS 1.2**. (Confirmed via dashboard screenshot 2026-07-14.)
- [x] Same page → **Always Use HTTPS → On**. (Screenshot + live 301 confirm.)
- [x] Same page → **Automatic HTTPS Rewrites → On**. (Screenshot confirm.)

Verification:
- [x] `curl.exe -sI http://coltonbearden.com` → `301` to `https://coltonbearden.com/` confirmed 2026-07-14. Note: this proves an edge redirect exists (Always Use HTTPS or a redirect rule) but not the SSL mode / Min TLS toggles — those still need the dashboard check above. Local TLS-version probing is inconclusive (Windows schannel won't offer TLS ≤1.1 client-side). Expect `https://` itself to return **522** until Phase 2 — the apex A record is the unroutable parking placeholder; there is no origin yet.

> **Re-probe note (second session, 2026-07-14):** after MCP re-auth, all six zone-settings endpoints (`dnssec`, `settings/ssl`, `settings/min_tls_version`, `settings/always_use_https`, `settings/automatic_https_rewrites`, `settings/security_header`) still return 401/403 (`10000`/`9109`). The permission gap is in the Cloudflare MCP server's OAuth grant itself, not the session — Tasks 7/8 stay dashboard-manual.

---

### Task 8: HSTS header [MANUAL — Dashboard]

- [x] Dashboard → `coltonbearden.com` → **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) → Enable**. (2026-07-14.)
- [x] Max Age Header: **12 months (31536000)**. Apply HSTS policy to subdomains: **On** (`includeSubDomains`). **Preload: leave OFF** (D5 — revisit only once Phase 2's full HTTPS footprint is stable). *(User initially enabled Preload; caught same day and switched off — the `preload` token invites third-party submission to the Chrome list via hstspreload.org, which accepts submissions from anyone while the header qualifies.)*

Verification:
- [x] Verified 2026-07-14: `strict-transport-security: max-age=31536000; includeSubDomains`, **no** `preload` token. Note: Cloudflare-generated error pages (the apex's by-design 522) don't carry zone security headers — verify against an edge-served path instead: `curl.exe -sI https://coltonbearden.com/cdn-cgi/trace` (a 404 there still carries the headers).

---

### Task 9: Send/receive test + deliverability check [MANUAL]

Requires a live mailbox — not automatable.

- [x] Send a test email from `inbox@coltonbearden.com` to your own Gmail/Outlook; send one back. (User reports the mailbox in active two-way use for several hours, 2026-07-14.)
- [x] Send a message to [mail-tester.com](https://www.mail-tester.com) from `inbox@` → confirm score **≥ 9/10**. (**10/10**, 2026-07-14: SPF pass, DKIM valid 2048-bit `key1` aligned, DMARC pass, rDNS `out-189.mta1.migadu.com` ✓, 0/23 blocklists.)
- [x] In Gmail, open the received test message → **Show original** → confirm SPF **PASS**, DKIM **PASS**, DMARC **PASS**. (Satisfied by mail-tester's independent `Authentication-Results`: `dmarc=pass`, `dkim=pass`, `Received-SPF: Pass` — same third-party-receiver evidence; a Gmail spot-check remains optional belt-and-braces.)

---

### Task 10: DMARC ramp — tighten after monitoring [MANUAL monitor, Cloudflare MCP to edit]

- [x] Monitor the `dmarc@coltonbearden.com` inbox for aggregate (`rua`) reports for **1–2 weeks** after Task 6. Confirm all reporting sources show `spf=pass` and/or `dkim=pass` with alignment. *(Window ran 2026-07-14 → 2026-09-03; user confirmed clean on 2026-09-03.)*
- [x] Once clean, tighten DMARC to `p=quarantine` (same `PUT` pattern as Task 6, record id `d20df6dfa9f8a92b0b13608f4758df00`, content `v=DMARC1; p=quarantine; rua=mailto:dmarc@coltonbearden.com; fo=1; adkim=s; aspf=s`). Confirm with user before applying. **Done 2026-09-04T07:38:54Z** via Cloudflare MCP `PATCH` (before: `p=none`, after: `p=quarantine`, rest of the record unchanged).
- [ ] After another clean monitoring window, tighten to `p=reject` (content `v=DMARC1; p=reject; rua=mailto:dmarc@coltonbearden.com; fo=1; adkim=s; aspf=s`). Confirm with user before applying — this restores the zone to its original hardened DMARC posture, now with a real, passing sender behind it.

---

## Phase 1 Acceptance Criteria (mirrors blueprint §3 verbatim)

- [x] DNSSEC shows **Active** in Cloudflare; DNSKEY returns keys. (Verified 2026-07-14 via DoH: 2 DNSKEYs, DS at parent, `AD: true`.)
- [ ] CAA query returns the 5 records (✓ verified via API 2026-07-14); test cert issuance still succeeds — *the currently-served edge cert works, but a post-CAA issuance won't be proven until the next Universal SSL renewal; spot-check then.*
- [x] Sent **and** received a test message from `inbox@coltonbearden.com`. (Mailbox in active use, 2026-07-14.)
- [x] mail-tester.com ≥ **9/10** (**10/10**, 2026-07-14); SPF + DKIM + DMARC all **pass** at an independent receiver (mail-tester `Authentication-Results`).
- [x] `strict-transport-security: max-age=31536000; includeSubDomains` served, no `preload` token. (Verified 2026-07-14 via `/cdn-cgi/trace` — CF error pages don't carry the header.)
- [x] After monitoring, DMARC tightened to at least `p=quarantine`. (2026-09-04; `p=reject` still pending its own window.)

---

## Execution Handoff

Two options once you're ready to run this:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline Execution** — batch execution in this session with checkpoints, especially for Task 6's confirm-before-replace step.

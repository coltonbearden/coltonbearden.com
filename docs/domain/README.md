# coltonbearden.com — domain lane

`coltonbearden.com` is a lifelong, multi-purpose personal domain: it carries the website, email, and every future use (subdomains for apps and services, identity proofs, and so on). This repository is its operating record (D28). The other lanes (public presence and design) are described in the root `CLAUDE.md`.

**Rule:** a new subdomain or a new use of the domain gets a decision row (blueprint §10) and a line in the registry below **before** any record is created. The DNS guardrail still applies: no record is deleted or overwritten without the exact before/after and the owner's go-ahead.

## Registrar and account

Public registration facts (RDAP, read 2026-09-30):

| Fact | Value |
|---|---|
| Registrar | Cloudflare, Inc. (IANA 1910) |
| Registered | 2026-01-03 |
| Expires | 2027-01-03 |
| EPP status | `clientTransferProhibited` |
| Nameservers | `adelaide.ns.cloudflare.com`, `kevin.ns.cloudflare.com` |
| DNSSEC | signed (DS key tag 2371, algorithm 13, digest type 2) |

Cloudflare: zone `bc9faf24541428e9ed5f3687d9ede3ef`, account `9a06f3b33d177e286938eec3240c6679`. Account labels, login details and security state are kept out of this public repo (D24); the operator's session reports hold the current state.

### Hygiene principles

The checklist is deliberately stateless here; whether each item holds is checked in operator sessions, not published.

- [ ] Registrar lock on (transfer prohibited).
- [ ] Auto-renew on, and a multi-year renewal considered well before expiry.
- [ ] Two-factor authentication on every account that can change the domain, its DNS or its email (registrar/Cloudflare, Migadu, GitHub).
- [ ] Account-recovery contacts on an address **not** hosted on this domain, so losing the domain or its mail can't lock the owner out of recovering it.
- [ ] Login emails on a domain that is itself renewed and under the owner's control.

## Subdomain registry

Every name in the zone (snapshot `dns/records.json`, 24 records on 2026-09-30). Proxied records point at a Worker custom domain; their content is not published (D28).

| Name | Purpose | Points at | Owner lane | Since | Decision |
|---|---|---|---|---|---|
| `coltonbearden.com` (AAAA) | the website | Cloudflare proxy (Worker custom domain, worker `coltonbearden-com`) | presence | 2026-07-15 | D12, D25 |
| `coltonbearden.com` (MX ×2, SPF TXT, `hosted-email-verify` TXT) | email: Migadu inbound, sender policy, Migadu domain verification | `aspmx1`/`aspmx2.migadu.com`; `include:spf.migadu.com -all` | domain | 2026-05-20 (SPF), 2026-07-14 | D2, D10 |
| `coltonbearden.com` (CAA ×5) | certificate issuance policy: `letsencrypt.org`, `pki.goog`, `ssl.com`; `issuewild ";"`; iodef → `security@` | — | domain | 2026-07-14 | D6 |
| `coltonbearden.com` (`docker-verification` TXT) | Docker domain verification | — | domain | 2026-08-13 | none (seen 2026-09-03, kept 2026-09-04) |
| `www` | redirect host: 301 → apex (Single Redirect rule) | Cloudflare proxy (Worker custom domain) | presence | 2026-07-15 | D25 |
| `mta-sts` | serves `/.well-known/mta-sts.txt`; everything else 301 → apex | Cloudflare proxy (Worker custom domain) | domain | 2026-07-15 | D17, D25 |
| `_mta-sts` | MTA-STS policy id (`id=20260904T073853Z`) | — | domain | 2026-07-15 | D17 |
| `_smtp._tls` | TLS-RPT reports → `tlsrpt@` | — | domain | 2026-07-14 | Phase 1 plan |
| `_dmarc` | DMARC `p=quarantine`, strict alignment, reports → `dmarc@` | — | domain | 2026-05-20 | D4, D18 |
| `key1`/`key2`/`key3._domainkey` | DKIM keys | CNAME → Migadu | domain | 2026-07-14 | D2 |
| `*._domainkey` | empty DKIM wildcard (`p=`, all keys revoked); the specific `key1-3` CNAMEs take precedence | — | domain | 2026-05-20 | none (pre-Migadu, kept 2026-09-04) |
| `autoconfig` | mail-client autoconfiguration | CNAME → `autoconfig.migadu.com` | domain | 2026-07-14 | Phase 1 plan |
| `_acme-challenge` | TXT left by an ACME DNS-01 issuance of an apex certificate by a client outside this repo | — | domain | 2026-07-28 | none (seen 2026-09-03, kept 2026-09-04) |
| `_tailscale-challenge` | Tailscale domain verification | — | domain | 2026-07-23 | none (seen 2026-09-03, kept 2026-09-04) |
| `answer` | Docker domain verification (same value as the apex record) | — | domain | 2026-08-13 | none (seen 2026-09-03, kept 2026-09-04) |

The records marked "none" were added outside any plan; the owner reviewed them on 2026-09-04 and kept them as-is. The retired GitHub org's two `_gh-*` verification TXT records were deleted on 2026-09-30 (D27).

## Email conventions

- Provider: Migadu (D2). Primary mailbox `inbox@coltonbearden.com` (D10).
- Role addresses, all forwarding to `inbox@`: `security@` (security.txt, CAA iodef), `dmarc@` (DMARC reports), `tlsrpt@` (TLS-RPT reports). These are public by design (D24).
- **Open decision:** a naming convention for per-service aliases (e.g. one alias per vendor) before the first one is created.

## Well-known files

| File | State |
|---|---|
| `/.well-known/security.txt` | present (RFC 9116), contact `security@`; **`Expires: 2027-09-01`** — refresh before then |
| `/.well-known/mta-sts.txt` | present, `mode: enforce`, `max_age: 1209600` (D17); canonical host `mta-sts.coltonbearden.com` |
| `/.well-known/webfinger`, `/.well-known/openpgpkey/`, `/.well-known/atproto-did`, `/.well-known/change-password` | not present |

## DNS snapshot and drift check

`dns/records.json` is the committed snapshot of the zone: `{id, type, name, content, ttl, proxied, priority}` per record, sorted by type, name, content and id. Record comments and tags (private Cloudflare metadata) are dropped, and a proxied record's content is replaced with `<proxied>` (D28).

- `node tools/dns/snapshot.mjs` rewrites the snapshot from the live zone.
- `node tools/dns/diff.mjs [--file <baseline>]` compares the live zone with it: exit 0 = no drift, 1 = drift (prints added, removed and changed records), 2 = usage or API error.
- Both read `CLOUDFLARE_API_TOKEN` (DNS read is enough) and `CLOUDFLARE_ZONE_ID` from the environment, refuse to run without them, and never print the token. `node --test tools/dns/lib.test.mjs` runs their unit tests (also in CI).
- After any intended DNS change, re-run the snapshot and commit it in the same PR as the decision row. A scheduled drift check in CI waits for a read-only token held as a repo secret.

## Use-case backlog — possible, not planned

Each becomes real only through a decision row.

- Short links: `go.` on a Worker + KV.
- Hosted remote MCP servers: `mcp.`.
- Homelab apps via Cloudflare Tunnel behind Access.
- File drops on R2 behind Access.
- Project subdomains for showcased repositories.
- Identity proofs: `rel="me"`, WebFinger, Bluesky `_atproto`, OpenPGP WKD.
- Newsletter or podcast feeds on the domain.
- A status page.
- A storefront for the reseller business.
- Personal API endpoints.
- AI-crawler policy files (`llms.txt`, `ai.txt`).

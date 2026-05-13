# Phase 2 — Domain & HTTPS Plan

## Current State

| Item | Value |
|------|-------|
| Backend URL | `http://trkil295kr3pg22ae1mk9o0h.76.13.212.82.sslip.io` |
| Admin Web URL | `http://t7h8w639cjfaqodo95rv5c92.76.13.212.82.sslip.io` |
| Protocol | HTTP only |
| TLS | ❌ Not configured |
| Coolify Proxy | Traefik v3.6, ports 80/443 open, ready for HTTPS |
| Domain owned | ❌ None |

## Free HTTPS Options (ranked by practicality)

### Option A: Keep sslip.io + HTTP (current — works for MVP)
- ✅ Already working
- ✅ No cost, no setup
- ✅ sslip.io resolves to any IP automatically
- ❌ No HTTPS — passwords sent in plaintext
- ❌ sslip.io URLs change on Coolify redeploy (UUID-based)
- ❌ Not suitable for production app store submission

### Option B: Cloudflare Tunnel (free HTTPS, no domain needed)
- ✅ Free HTTPS via Cloudflare edge certificate
- ✅ No port forwarding needed
- ✅ Can use `*.trycloudflare.com` subdomain (temporary) or a Cloudflare-managed domain
- ⚠️ Requires `cloudflared` daemon on VPS
- ⚠️ Adds dependency on Cloudflare
- ⚠️ trycloudflare URLs are temporary (change on restart)

### Option C: DuckDNS + Let's Encrypt (free subdomain)
- ✅ Free subdomain (e.g., `jommakcik.duckdns.org`)
- ✅ Coolify supports Let's Encrypt with real domains
- ⚠️ Requires DuckDNS account + update script
- ⚠️ Subdomain is public and less professional

### Option D: Buy a cheap domain (~$2-15/year) ★ RECOMMENDED
- ✅ Professional: `jommakcik.com` or `jommakcik.my`
- ✅ Let's Encrypt works natively with Coolify
- ✅ Persistent URLs (no UUID changes)
- ✅ Can use for Play Store listing later
- ✅ Low cost: `.xyz` ~$1/year, `.com` ~$10/year, `.my` ~$15/year
- ⚠️ Requires purchase and DNS management

## Recommended Path

```
Phase 2A (now):   Document the plan + prepare config — NO domain changes
Phase 2B (later): Purchase domain → configure DNS → enable HTTPS
```

## Phase 2A — What We Can Do Now

### 1. Prepare CORS Configuration

Current: `app.use(cors())` — allows ALL origins (⚠️ risky in production)

**Plan:** Add environment-variable-based CORS:

```javascript
// backend/src/config/env.js — add:
corsOrigins: process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
```

```javascript
// backend/src/app.js — change:
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
```

### 2. Prepare Environment Variable Template

Add to `backend/.env.example` and Coolify env vars:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

After domain purchase, this becomes:

```env
CORS_ORIGINS=https://admin.jommakcik.com,http://localhost:5173,http://localhost:3000
```

### 3. Document Exact DNS Records (for when domain is bought)

```
Type: A
Name: @
Value: 76.13.212.82
TTL:  3600

Type: A
Name: api
Value: 76.13.212.82
TTL:  3600

Type: A
Name: admin
Value: 76.13.212.82
TTL:  3600
```

### 4. Document Coolify FQDN Setup (for when domain is ready)

In Coolify UI (http://76.13.212.82:8000):

**Backend service (trkil...):**
1. Edit application → Domains
2. Add: `api.jommakcik.com`
3. Coolify auto-generates Let's Encrypt certificate
4. Service becomes available at `https://api.jommakcik.com`

**Admin Web service (t7h8...):**
1. Edit application → Domains
2. Add: `admin.jommakcik.com`
3. Coolify auto-generates Let's Encrypt certificate

### 5. Environment Variables to Update (after domain)

| Service | Variable | Old | New |
|---------|----------|-----|-----|
| Backend | CORS_ORIGINS | (not set) | `https://admin.jommakcik.com,http://localhost:5173` |
| Admin Web | VITE_API_BASE_URL | `http://trkil...sslip.io` | `https://api.jommakcik.com` |
| Passenger App | EXPO_PUBLIC_API_BASE_URL | `http://trkil...sslip.io` | `https://api.jommakcik.com` |
| Rider App | EXPO_PUBLIC_API_BASE_URL | `http://trkil...sslip.io` | `https://api.jommakcik.com` |
| Admin App | EXPO_PUBLIC_API_BASE_URL | `http://trkil...sslip.io` | `https://api.jommakcik.com` |

### 6. HTTPS Auto-Configuration (Coolify does this)

When you add a custom domain in Coolify:
1. Coolify detects the domain
2. Requests Let's Encrypt certificate via Traefik
3. Auto-renews before expiry
4. Forces HTTP→HTTPS redirect (optional, enabled by default)

**No manual certbot commands needed.** Coolify handles everything.

## Rollback Plan (if domain/HTTPS fails)

1. Remove custom domain from Coolify service
2. Service reverts to sslip.io URL
3. Revert `VITE_API_BASE_URL` to sslip.io URL
4. Re-deploy admin-web
5. Revert `EXPO_PUBLIC_API_BASE_URL` in mobile apps
6. All URLs continue working via HTTP on sslip.io

## Manual Steps Required from Owner

1. **Purchase a domain** (any registrar: Namecheap, GoDaddy, Hostinger, etc.)
2. **Point DNS A records** to `76.13.212.82`
3. **Wait for DNS propagation** (5-30 minutes)
4. **Verify DNS** with: `nslookup api.jommakcik.com` → should return `76.13.212.82`

## What Codex Can Safely Do (after domain confirmed)

1. ✅ Update `backend/.env.example` with CORS_ORIGINS
2. ✅ Implement CORS origin check in `app.js`
3. ✅ Update Coolify env vars via API
4. ✅ Update admin-web env var
5. ✅ Update mobile app `.env` files
6. ✅ Trigger redeploy of admin-web
7. ✅ Test HTTPS endpoints
8. ✅ Verify CORS works

## What Codex Must NOT Do

1. ❌ Purchase domain
2. ❌ Configure DNS records
3. ❌ Change Coolify service FQDN
4. ❌ Remove existing sslip.io URLs
5. ❌ Force HTTPS redirect before confirming HTTPS works

## Estimated Cost

| Item | Cost |
|------|------|
| `jommakcik.com` (Namecheap) | ~$10.98/year |
| `jommakcik.my` (MYNIC) | ~RM 40/year |
| `jommakcik.xyz` (budget) | ~$1/year |
| Let's Encrypt SSL | Free |
| Coolify HTTPS management | Free |

## Recommendation

**For MVP:** Keep sslip.io + HTTP (current). Implement CORS hardening in Phase 4. 

**For production:** Purchase `jommakcik.com` or `jommakcik.my`. One-time domain setup + 5 minutes of Coolify config = full HTTPS.

---

## Files to Change (Phase 2B — after domain purchase)

| File | Change |
|------|--------|
| `backend/src/config/env.js` | Add `corsOrigins` |
| `backend/src/app.js` | Replace `cors()` with origin-checked CORS |
| `backend/.env.example` | Add `CORS_ORIGINS` |
| `admin-web/.env.example` | Update `VITE_API_BASE_URL` |
| `passenger-app/.env` | Create with `EXPO_PUBLIC_API_BASE_URL` |
| `rider-app/.env` | Create with `EXPO_PUBLIC_API_BASE_URL` |
| `admin-app/.env` | Create with `EXPO_PUBLIC_API_BASE_URL` |
| Coolify (via API) | Update env vars for backend + admin-web |
| Coolify (via UI) | Add custom domains to services |

## Test Checklist (after domain + HTTPS active)

- [ ] `curl https://api.jommakcik.com/health` → 200 OK
- [ ] `curl https://admin.jommakcik.com/` → 200 OK (SPA served)
- [ ] Admin web login works over HTTPS
- [ ] Mobile app connects to HTTPS backend
- [ ] CORS blocks unknown origins
- [ ] CORS allows admin.jommakcik.com
- [ ] HTTP→HTTPS redirect works
- [ ] Certificate is valid (check in browser)
- [ ] Old sslip.io URLs still work (for backward compat)

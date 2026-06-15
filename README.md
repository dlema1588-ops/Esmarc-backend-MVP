# Esmarc Complete Platform v2.0

**Complete multi-tenant SaaS platform with videos, messaging, analytics, and feature flags.**

---

## What's Inside

- `index.js` — Complete backend (all features, one file)
- `package.json` — All dependencies
- `migrations.sql` — Database tables for videos, messaging, notifications, analytics
- `.env.example` — Configuration template
- `API_DOCS.md` — Complete API reference
- `ADMIN_DASHBOARD_BRIEF_V2.md` — Brief for building admin dashboard
- `README.md` — This file

---

## Setup

### 1. Create Database Tables

1. Go to **supabase.com** → your project
2. Go to **SQL Editor**
3. Copy entire `migrations.sql`
4. Paste and execute
5. ✅ All tables created

### 2. Set Up Storage (for image uploads)

1. In Supabase, go to **Storage**
2. Create bucket: `images`
3. Make it **Public**
4. ✅ Image storage ready

### 3. Deploy to Render

1. Upload these files to GitHub repo
2. Create new web service on Render
3. Connect GitHub repo
4. Settings:
   - Language: **Node**
   - Build: **`npm install`**
   - Start: **`node index.js`**
5. Set environment variables (from `.env.example`)
6. Deploy
7. ✅ Backend live!

---

## Environment Variables

Copy `.env.example` to `.env` and fill:

```
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (from Settings → API Keys → Service Role)
JWT_SECRET=your-secret-key-change-this
PORT=4000
NODE_ENV=production
API_BASE_URL=https://your-render-url.onrender.com
CHAPA_SECRET_KEY=optional-chapa-key
```

---

## Features Included

### ✅ Core (v0)
- Multi-tenant isolation
- Products CRUD
- Orders management
- Payments (Chapa)
- Authentication

### ✅ Complete (v2.0)
- **Video Management** with approval workflow
- **Image Upload** with auto-compression
- **Messaging** (two-way: customer ↔ shop, shop ↔ admin)
- **Notifications** (one-way: admin → shop → customers)
- **Analytics** with UTM tracking (Telegram, YouTube, TikTok, Instagram sources)
- **Customer Lists** (all unique customers)
- **Feature Flags** (super admin controls what's locked/unlocked)

---

## API Endpoints

See `API_DOCS.md` for complete reference. Quick overview:

```
Config
  GET /api/config

Auth
  POST /api/auth/login
  POST /api/auth/register

Products
  GET /api/products
  POST /api/products
  PATCH /api/products/:id
  DELETE /api/products/:id

Upload
  POST /api/upload/image (multipart/form-data with image file)

Videos
  POST /api/videos (shop owner submits video URL)
  GET /api/videos (get approved videos)
  PATCH /api/videos/:id/status (super admin approves/rejects)

Orders
  POST /api/orders
  GET /api/orders
  PATCH /api/orders/:id/status

Customers
  GET /api/customers

Messages
  POST /api/messages
  GET /api/messages/:recipientId

Notifications
  POST /api/notifications
  GET /api/notifications
  PATCH /api/notifications/:id/read

Analytics
  POST /api/analytics/track
  GET /api/analytics/dashboard

Feature Flags
  POST /api/feature-flags (super admin)
  GET /api/feature-flags/:feature
```

---

## Building the Admin Dashboard

1. Read `ADMIN_DASHBOARD_BRIEF_V2.md` completely
2. Copy the brief
3. Go to **Google AI Studio** (Gemini)
4. Paste prompt:

```
Build a complete React admin dashboard based on this specification:

[PASTE ENTIRE BRIEF HERE]

Make it professional, production-ready, and fully functional with the API.
```

5. Gemini generates complete admin dashboard code
6. Send code to me for integration/fixes

---

## Database Schema

### New Tables (v2.0)

**videos**
- id, shop_id, title, url, description, status (pending/approved/rejected), created_at

**messages**
- id, sender_id, recipient_id, message, type (customer/admin/superadmin), read, created_at

**notifications**
- id, sender_id, recipient_id, title, body, read, created_at

**analytics_events**
- id, shop_id, event_type, source (direct/telegram/youtube/tiktok/instagram), metadata, created_at

**feature_flags**
- id, shop_id, feature, enabled, created_at, updated_at

---

## Multi-Tenant Design

- **Tenant Detection:** Subdomain or query param (`?tenant=shop-name`)
- **Isolation:** Every table has `shop_id` foreign key
- **Shop Owners:** Only see their own shop's data
- **Super Admin:** Can see all shops, approve videos, control feature flags

---

## Security

- ✅ JWT token-based auth
- ✅ CORS restricted to esmarc.com domains
- ✅ Rate limiting (100 requests/15 mins)
- ✅ Helmet security headers
- ✅ Service role key never exposed to frontend
- ✅ All requests server-validated

---

## Testing

### Test Health Check
```
curl https://your-render-url.onrender.com/health
```
Should return:
```json
{
  "status": "ok",
  "service": "esmarc-api-complete",
  "version": "2.0"
}
```

### Test Shop Config
```
curl https://your-render-url.onrender.com/api/config?tenant=your-shop-name
```
Should return shop info or "Shop not found" (if shop doesn't exist)

---

## Architecture

```
Frontend (React Admin Dashboard)
    ↓
API (Node.js Backend) ← You are here
    ↓
Supabase (Database + Auth + Storage)
    ↓
Chapa (Payments)
```

---

## Troubleshooting

**"Shop not found"**
- Tenant name doesn't exist in database
- Check subdomain or query param

**"Invalid token"**
- JWT expired (7 day limit)
- User needs to login again

**Image upload fails**
- Check Supabase storage bucket is public
- Check file size < 10MB

**Video not showing**
- Super admin needs to approve it first
- Check status is "approved"

---

## Next Steps

1. ✅ Deploy this backend
2. ⬜ Build admin dashboard (Gemini)
3. ⬜ Build customer storefront
4. ⬜ Build super admin console
5. ⬜ Add more features based on feedback

---

## Questions?

Refer to:
- `API_DOCS.md` — API details
- `ADMIN_DASHBOARD_BRIEF_V2.md` — Dashboard specs
- `migrations.sql` — Database schema
- Code comments in `index.js`

---

**Version:** 2.0 Complete Platform
**Status:** Ready for production
**Last Updated:** June 2026

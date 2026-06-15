# Esmarc Complete Platform - API Documentation v2.0

**Base URL:** `https://esmarc-backend-v0.onrender.com` (or your Render URL)

---

## AUTHENTICATION

All endpoints (except config, register, login) require JWT token:
```
Authorization: Bearer {token}
```

---

## CONFIG & SETUP

### Get Shop Config
```
GET /api/config?tenant=shop-name
```
Response:
```json
{
  "id": "uuid",
  "name": "Shop Name",
  "theme_color": "#ff4500",
  "logo_url": "...",
  "banner_url": "...",
  "address": "...",
  "phone": "..."
}
```

---

## AUTHENTICATION

### Login
```
POST /api/auth/login
Body: { email, password }
```
Response:
```json
{
  "token": "jwt-token",
  "user": { "id", "email", "role" }
}
```

### Register
```
POST /api/auth/register
Body: { email, password, name }
```
Response: Same as login

---

## PRODUCTS

### Get All Products
```
GET /api/products?category=electronics&limit=20&offset=0
```

### Add Product
```
POST /api/products
Auth: Required
Body: {
  "name": "Product Name",
  "description": "...",
  "price": 100,
  "currency": "ETB",
  "stock": 50,
  "category": "electronics",
  "image_url": "https://...",
  "video_url": "https://youtube.com/watch?v=..."
}
```

### Update Product
```
PATCH /api/products/:id
Auth: Required
Body: { name, description, price, stock, image_url, video_url }
```

### Delete Product
```
DELETE /api/products/:id
Auth: Required
```

---

## IMAGE UPLOAD

### Upload & Compress Image
```
POST /api/upload/image
Auth: Required
Content-Type: multipart/form-data
File: image file (max 10MB)
```
Response:
```json
{
  "url": "https://supabase-url/storage/...",
  "filename": "1234567-uuid.jpg"
}
```
**Notes:**
- Automatically compressed to max 1200x1200px
- JPEG quality 80%
- Returns public URL

---

## VIDEOS (with Approval)

### Add Video (Shop Owner)
```
POST /api/videos
Auth: Required
Body: {
  "title": "Product Demo",
  "url": "https://youtube.com/watch?v=...",
  "description": "Optional"
}
```
Response:
```json
{
  "id": "uuid",
  "status": "pending",
  "message": "Video submitted for approval"
}
```
**Workflow:**
1. Shop owner submits YouTube/TikTok URL
2. Status = "pending"
3. Super admin approves/rejects
4. Only "approved" videos show to customers

### Get Approved Videos
```
GET /api/videos
```
Returns only approved videos

### Approve/Reject Video (Super Admin Only)
```
PATCH /api/videos/:id/status
Auth: Required (Super Admin)
Body: { "status": "approved" or "rejected" }
```

---

## ORDERS

### Create Order
```
POST /api/orders
Body: {
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "delivery_address": "123 Main St",
  "customer_name": "John",
  "customer_phone": "0912345678",
  "utm_source": "telegram" or "youtube" or "tiktok" or "instagram"
}
```
Response:
```json
{
  "order": { "id", "customer_name", "total", "status" },
  "message": "Order placed"
}
```

### Get All Orders (Admin)
```
GET /api/orders
Auth: Required
```
Returns all orders for the shop with order items details

### Update Order Status
```
PATCH /api/orders/:id/status
Auth: Required
Body: { "status": "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" }
```

---

## CUSTOMERS

### Get Customer List (Admin)
```
GET /api/customers
Auth: Required
```
Returns unique customers who placed orders
```json
{
  "customers": [
    { "customer_name": "John", "customer_phone": "0912345678", "created_at": "..." }
  ],
  "count": 45
}
```

---

## MESSAGING (Two-Way)

### Send Message
```
POST /api/messages
Auth: Required
Body: {
  "recipient_id": "user-uuid",
  "message": "Hello!",
  "type": "customer" | "admin" | "superadmin"
}
```

### Get Messages with User
```
GET /api/messages/:recipientId
Auth: Required
```
Returns all messages between you and recipient, sorted by date

**Flows:**
- Customer → Shop Owner (type: "customer")
- Shop Owner → Super Admin (type: "admin")
- Super Admin → Shop Owner (type: "superadmin")

---

## NOTIFICATIONS (One-Way Alerts)

### Send Notification
```
POST /api/notifications
Auth: Required
Body: {
  "recipient_id": "user-uuid",
  "title": "Order Confirmed",
  "body": "Your order #123 has been confirmed"
}
```

### Get My Notifications
```
GET /api/notifications
Auth: Required
```
Returns unread notifications only
```json
{
  "notifications": [...],
  "unread_count": 3
}
```

### Mark as Read
```
PATCH /api/notifications/:id/read
Auth: Required
```

**Flows:**
- Super Admin → Shop Owner (important updates)
- Shop Owner → Customers (order updates, promotions)

---

## ANALYTICS & UTM TRACKING

### Track Event
```
POST /api/analytics/track
Body: {
  "event_type": "order_created" | "page_view" | "etc",
  "source": "telegram" | "youtube" | "tiktok" | "instagram" | "direct",
  "metadata": { custom data }
}
```

### Get Analytics Dashboard
```
GET /api/analytics/dashboard
Auth: Required
```
Response:
```json
{
  "total_orders": 50,
  "total_revenue": 5000,
  "pending_orders": 3,
  "sources": {
    "telegram": 15,
    "youtube": 20,
    "tiktok": 10,
    "direct": 5
  }
}
```
**What this shows:**
- How many customers came from each source (Telegram, YouTube, etc.)
- Which marketing channel is most effective
- Conversion tracking by source

---

## FEATURE FLAGS (Super Admin Controls)

### Enable/Disable Feature for Shop
```
POST /api/feature-flags
Auth: Required (Super Admin)
Body: {
  "shop_id": "shop-uuid",
  "feature": "video" | "analytics" | "notifications",
  "enabled": true | false
}
```

### Check if Feature is Enabled
```
GET /api/feature-flags/:feature
```
Response:
```json
{
  "feature": "video",
  "enabled": true
}
```
If disabled, show "Coming Soon" to shop owner

---

## PAYMENTS

### Initiate Chapa Payment
```
POST /api/payments/initiate/:orderId
Auth: Required
```
Response:
```json
{
  "payment_url": "https://chapa.co/checkout/...",
  "tx_ref": "ESMARC-shop-orderid-timestamp"
}
```

### Payment Webhook (Chapa Callback)
```
POST /api/payments/webhook
Body: { trx_ref, status: "success" }
```
(Chapa sends this automatically - order status updates to "paid")

---

## CONTACT

### Send Contact Message
```
POST /api/contact
Body: {
  "message": "I have a question...",
  "customer_name": "John",
  "customer_phone": "0912345678"
}
```

---

## ERRORS

All errors return:
```json
{
  "error": "Error message"
}
```

Common status codes:
- 400: Bad request
- 401: Unauthorized (no token or invalid token)
- 403: Forbidden (not super admin, etc.)
- 404: Not found
- 500: Server error

---

## MULTI-TENANT

All requests detect tenant via:
1. Subdomain: `shop-name.esmarc.com` → extracts "shop-name"
2. Query param: `?tenant=shop-name`

Requests are isolated - shop owners only see THEIR data.

---

## COMPLETE FEATURE LIST

✅ Multi-tenant isolation
✅ Product management (CRUD)
✅ Image upload & compression
✅ Video URLs with approval workflow
✅ Order management with UTM tracking
✅ Customer list management
✅ Two-way messaging (customer ↔ shop, shop ↔ admin)
✅ One-way notifications (admin → shop → customers)
✅ Analytics dashboard with traffic source tracking
✅ Feature flags (super admin controls what's enabled)
✅ Chapa payment integration
✅ JWT authentication
✅ Rate limiting
✅ Security headers

---

**Ready to build the Admin Dashboard with all these features!**

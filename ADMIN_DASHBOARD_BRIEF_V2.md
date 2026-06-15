# Complete Shop Owner Admin Dashboard - Conversion Brief

**Version:** 2.0 (Complete Platform)

**Target:** Build a comprehensive React admin dashboard for shop owners to manage their complete business.

---

## What Is This?

A **professional web dashboard** where shop owners (business owners) can:
- ✅ Manage products with images and video URLs
- ✅ Track and manage orders with customer info
- ✅ View analytics showing where customers come from (Telegram, YouTube, TikTok, Instagram, etc.)
- ✅ Send/receive messages with customers and super admin
- ✅ Receive notifications from super admin
- ✅ View all customers who purchased
- ✅ Monitor sales performance in real-time

**Access:** `admin.esmarc.com` or `admin-SHOP-NAME.esmarc.com`

---

## Who Uses It?

**Shop Owner** — The person who owns/manages the shop (e.g., Sara who runs Sara's Fashion Shop)

Not customers. Not super admin. Just the shop owner managing their business.

---

## Key Sections Required

### 1. **Login Screen**
- Email + Password
- Call: `POST /api/auth/login`
- Store JWT token in localStorage
- Redirect to dashboard

### 2. **Dashboard (Overview)**
- Welcome: "Welcome back, [Shop Name]!"
- **Quick Stats Cards:**
  - Total Orders (this month)
  - Total Revenue (this month)
  - Pending Orders (needs attention)
  - Unique Customers (count)
- **Traffic Sources Chart:**
  - How many customers from Telegram vs YouTube vs TikTok vs Instagram vs Direct
  - Bar/Pie chart showing distribution
  - Call: `GET /api/analytics/dashboard`

### 3. **Products Management**
- **View Products Table:**
  - Product name, price, stock, category, image, video URL, status
  - Call: `GET /api/products`
  - Searchable by name
  - Filter by category
  - Sort by price/stock
- **Add Product Modal/Form:**
  - Name (required)
  - Description
  - Price (required)
  - Currency (ETB default)
  - Stock quantity
  - Category
  - Image URL field (paste URL)
  - **New:** Image Upload button → calls `POST /api/upload/image` → returns URL (auto-compress)
  - **New:** Video URL field (YouTube/TikTok link - just paste URL)
  - Call: `POST /api/products`
  - Show success message
- **Edit Product Modal:**
  - Update any field
  - Call: `PATCH /api/products/:id`
- **Delete Product:**
  - Confirm before deleting
  - Call: `DELETE /api/products/:id`

### 4. **Orders Management**
- **View Orders Table:**
  - Order ID, customer name, phone, amount, status, date
  - Filter by status (pending, confirmed, preparing, out for delivery, delivered)
  - Sort by date/amount
  - Call: `GET /api/orders`
- **Order Detail Modal:**
  - Click order to expand/see details
  - Customer name, phone, delivery address
  - Items ordered (product, qty, price)
  - Total amount
  - **Current status with dropdown to update**
  - Statuses: pending → confirmed → preparing → out_for_delivery → delivered
  - Call: `PATCH /api/orders/:id/status`
  - **Show UTM source:** Where order came from (Telegram, YouTube, TikTok, Instagram, Direct)

### 5. **Customers Page**
- **Customer List:**
  - All unique customers who placed orders
  - Display: Name, Phone, First order date, Order count
  - Call: `GET /api/customers`
  - Searchable by name/phone
  - Shows customer summary

### 6. **Analytics Dashboard**
- **Key Metrics:**
  - Total Orders (all time)
  - Total Revenue (all time)
  - Average Order Value
  - Repeat Customers %
- **Traffic Source Breakdown:**
  - Chart showing: Telegram, YouTube, TikTok, Instagram, Direct
  - "This Telegram link brought 50 customers"
  - "This YouTube video brought 30 customers"
  - Shows effectiveness of each marketing channel
  - Call: `GET /api/analytics/dashboard`
- **Traffic by date (optional):** Orders over time graph

### 7. **Messaging Page**
- **Message Inbox/List:**
  - Show all conversations (customers, super admin)
  - Unread indicator
- **Message Thread:**
  - Click conversation to see messages
  - Call: `GET /api/messages/:recipientId`
  - Show message history with timestamps
- **Send Message:**
  - Input field to reply
  - Call: `POST /api/messages`
  - Send button
  - **Flows:**
    - Receive from customers (about orders/products)
    - Receive from super admin (important updates)
    - Send to customers (order updates, questions)
    - Send to super admin (reports, issues)

### 8. **Notifications**
- **Top Bar Badge:**
  - Show unread notification count
  - Call: `GET /api/notifications`
- **Notification Dropdown/Page:**
  - List of all notifications
  - Each has title + body
  - Mark as read when clicked
  - Call: `PATCH /api/notifications/:id/read`
  - **Flows:**
    - Super admin sends: "New feature available"
    - Super admin sends: "Your video was approved/rejected"
    - Super admin sends: "Your analytics are ready"

### 9. **Settings Page**
- **Shop Info Display:**
  - Shop name, description, category
  - Address, phone
  - Logo URL, theme color
  - (Read-only or edit optional)
- **Feature Status (Show Locked/Unlocked):**
  - "📹 Videos - ✅ Enabled" or "🔒 Locked (Coming Soon)"
  - "📊 Analytics - ✅ Enabled" or "🔒 Locked"
  - "💬 Notifications - ✅ Enabled"
  - Call: `GET /api/feature-flags/:feature`
  - Shows what super admin has enabled for this shop
  - Locked features show "Coming Soon" message

### 10. **Logout**
- Clear JWT token from localStorage
- Redirect to login

---

## Navigation Structure

**Left Sidebar (Always Visible):**
- Dashboard (chart icon)
- Products (box icon)
- Orders (shopping-cart icon)
- Customers (people icon)
- Analytics (trend icon)
- Messages (envelope icon)
- Settings (gear icon)
- Logout (exit icon)

**Top Bar:**
- Shop name/logo
- Notifications bell with unread count
- User profile menu
- Logout button

**Responsive:**
- Desktop: Sidebar + content
- Mobile: Hamburger menu

---

## API Integration Details

**Base URL:** `https://esmarc-backend-v0.onrender.com`

**Multi-tenant:**
- Detect shop from subdomain OR query param
- Example: `admin-saras-shop.esmarc.com` extracts "saras-shop"
- OR use: `?tenant=saras-shop`

**Authentication:**
- Login returns JWT token
- Store in localStorage
- Include in all requests: `Authorization: Bearer {token}`
- Token auto-expires in 7 days (refresh/re-login needed)

**Error Handling:**
- Show user-friendly error messages
- "Something went wrong" if 500 error
- "Unauthorized" if 401 error
- "Access denied" if 403 error

---

## Key API Endpoints

```
POST /api/auth/login
GET /api/config
GET /api/products
POST /api/products
PATCH /api/products/:id
DELETE /api/products/:id

POST /api/upload/image (for image compression)

POST /api/videos
GET /api/videos (approved videos only)
PATCH /api/videos/:id/status (super admin approves)

POST /api/orders
GET /api/orders (all shop orders)
PATCH /api/orders/:id/status (update status)

GET /api/customers (unique customer list)

GET /api/messages/:recipientId
POST /api/messages

GET /api/notifications
PATCH /api/notifications/:id/read

GET /api/analytics/dashboard (traffic sources + stats)

GET /api/feature-flags/:feature (check if enabled)
```

---

## Tech Stack

- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS
- **State:** React hooks (useState, useContext) or Zustand
- **HTTP:** Fetch API or axios
- **Charts:** Recharts or Chart.js
- **Storage:** localStorage for JWT token
- **UI Components:** Headless UI or shadcn/ui
- **Icons:** Lucide React or Heroicons

---

## Design Guidelines

- **Professional & Modern:** Business dashboard, not trendy
- **Color Scheme:** Use shop's theme_color from API for accent colors
- **Layout:** Clean, organized, logical flow
- **Tables:** Sortable, searchable, pagination for large datasets
- **Forms:** Clear validation, helpful error messages
- **Charts:** Simple, readable, mobile-responsive
- **Loading States:** Show spinners while fetching
- **Success/Error Toasts:** Notify user of actions
- **Responsive:** Works on desktop/tablet (mobile nice-to-have)
- **Accessibility:** Readable fonts, good contrast, keyboard navigation

---

## Key Features Summary

✅ **Products:** Full CRUD with image upload + compression, video URLs
✅ **Orders:** View all, update status, see customer details, UTM source tracking
✅ **Customers:** List all unique customers
✅ **Analytics:** Revenue, order count, traffic source breakdown (Telegram/YouTube/TikTok/Instagram/Direct)
✅ **Messaging:** Two-way messages with customers and super admin
✅ **Notifications:** Receive alerts from super admin
✅ **Feature Flags:** Show which features are enabled/locked
✅ **Settings:** View shop info and feature status
✅ **Auth:** JWT-based login with 7-day session
✅ **Multi-tenant:** Only see own shop's data
✅ **Security:** All requests validated server-side

---

## Advanced Features (Building Blocks)

**Image Compression:**
- User uploads image file
- Backend automatically resizes to 1200x1200px
- Compresses to JPEG quality 80%
- Returns public URL
- Frontend shows preview

**Video Approval Workflow:**
- Shop owner pastes YouTube/TikTok URL
- Video status = "pending"
- Super admin approves/rejects
- Only approved videos appear in frontend

**UTM Tracking:**
- When customer places order, include source (Telegram, YouTube, etc.)
- Backend tracks in analytics_events table
- Admin dashboard shows: "50 customers from Telegram, 30 from YouTube"
- Helps shop owner know which marketing works best

**Feature Flags:**
- Super admin can lock/unlock features per shop
- Locked features show "Coming Soon" badge
- Allows gradual rollout of new features

---

## Screens to Build

1. **Login** — Email/password form
2. **Dashboard** — Overview + quick stats + traffic chart
3. **Products List** — Table with CRUD actions, image upload, video URL
4. **Add/Edit Product Modal** — Form with image upload
5. **Orders List** — Table with status filter + sorting
6. **Order Detail** — Click to expand order details + update status
7. **Customers List** — All unique customers
8. **Analytics** — Revenue, orders, traffic source breakdown
9. **Messaging** — Inbox + message threads
10. **Notifications** — Bell + notification list
11. **Settings** — Shop info + feature status

---

## Success Criteria (MVP)

✅ Shop owner can log in
✅ Dashboard shows stats + traffic breakdown
✅ Can add/edit/delete products with images
✅ Can upload and compress images
✅ Can add video URLs (YouTube/TikTok)
✅ Can view all orders
✅ Can update order status
✅ Can see customer list
✅ Can view analytics dashboard (traffic sources)
✅ Can send/receive messages with customers
✅ Can receive notifications from super admin
✅ Feature flags show locked/unlocked status
✅ JWT auth working
✅ Only sees own shop's data
✅ Responsive design (desktop/tablet)
✅ Professional UI

---

## Next Steps

After this admin dashboard is complete:
1. Build **Customer Storefront** (separate React app)
2. Build **Super Admin Console** (control all shops)
3. Add more analytics features
4. Add integrations (Telegram bot, etc.)

---

**This is the complete Admin Dashboard. Shop owners will use this to manage their entire business!**

Give this brief to Gemini and it will generate a complete, production-ready admin dashboard.

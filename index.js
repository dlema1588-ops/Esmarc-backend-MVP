import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// File upload middleware
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY & MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

app.use(helmet());
app.use(cors({ origin: (origin, callback) => { if (!origin) return callback(null, true); if (origin.endsWith('.esmarc.com') || origin.includes('localhost')) callback(null, true); else callback(new Error('CORS blocked')); }, credentials: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getTenant(req) {
  const host = req.headers.host || '';
  let subdomain = req.query.tenant;
  if (!subdomain) { const parts = host.split('.'); if (parts.length >= 3) subdomain = parts[0]; }
  if (!subdomain) throw { status: 400, error: 'No tenant' };
  const { data: shop } = await supabase.from('shops').select('*').eq('subdomain', subdomain).single();
  if (!shop || !shop.is_active) throw { status: 404, error: 'Shop not found' };
  return shop;
}

function verifyAuth(req) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) throw { status: 401, error: 'No token' };
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { throw { status: 401, error: 'Invalid token' }; }
}

function verifySuperAdmin(decoded) {
  if (decoded.role !== 'superadmin') throw { status: 403, error: 'Super admin only' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'esmarc-api-complete', version: '2.0' }));

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/config', async (req, res) => {
  try {
    const shop = await getTenant(req);
    res.json({ id: shop.id, name: shop.name, subdomain: shop.subdomain, business_type: shop.category, theme_color: shop.theme_color || '#ff4500', logo_url: shop.logo_url, banner_url: shop.banner_url, tagline: shop.tagline, address: shop.address, phone: shop.phone });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const shop = await getTenant(req);
    if (!email || !password) return res.status(400).json({ error: 'Email/password required' });
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (signInError || !data.user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const { data: membership } = await supabase.from('shop_members').select('role').eq('shop_id', shop.id).eq('user_id', data.user.id).single();
    if (!membership) return res.status(403).json({ error: 'No shop access' });
    
    const token = jwt.sign({ id: data.user.id, email: data.user.email, shop_id: shop.id, role: membership.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: data.user.id, email: data.user.email, role: membership.role } });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const shop = await getTenant(req);
    if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
    
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.toLowerCase(), password, options: { data: { name } } });
    if (signUpError || !data.user) return res.status(400).json({ error: 'Could not create account' });
    
    await supabase.from('shop_members').insert({ shop_id: shop.id, user_id: data.user.id, role: 'customer' });
    const token = jwt.sign({ id: data.user.id, email: data.user.email, shop_id: shop.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: data.user.id, email: data.user.email } });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHOPS MANAGEMENT (Super Admin Only)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/shops', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);

    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw { status: 500, error: 'Could not load shops' };

    res.json({ shops, count: shops.length });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/shops/:id', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);

    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !shop) throw { status: 404, error: 'Shop not found' };

    const { data: orders } = await supabase.from('orders').select('total, status').eq('shop_id', shop.id);
    const { data: products } = await supabase.from('products').select('id').eq('shop_id', shop.id);
    const { data: flags } = await supabase.from('feature_flags').select('feature, enabled').eq('shop_id', shop.id);

    res.json({
      shop,
      stats: {
        total_orders: orders?.length || 0,
        total_revenue: orders?.reduce((sum, o) => sum + o.total, 0) || 0,
        total_products: products?.length || 0
      },
      feature_flags: flags || []
    });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.post('/api/shops', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);

    const { name, subdomain, category, description, address, phone, owner_email } = req.body;
    if (!name || !subdomain) return res.status(400).json({ error: 'Name and subdomain required' });

    const { data: existing } = await supabase.from('shops').select('id').eq('subdomain', subdomain).single();
    if (existing) return res.status(409).json({ error: 'Subdomain already taken' });

    let owner_id = null;
    if (owner_email) {
      const { data: invite } = await supabase.auth.admin.inviteUserByEmail(owner_email);
      owner_id = invite?.user?.id || null;
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        name, subdomain, category, description, address, phone,
        owner_id,
        is_active: false, // starts inactive until verified
        verification_status: 'pending'
      })
      .select()
      .single();

    if (error) throw { status: 500, error: 'Could not create shop' };

    res.status(201).json({ shop, message: 'Shop created. Pending verification.' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/shops/:id', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);

    const { name, description, address, phone, is_active, verification_status, theme_color, logo_url, banner_url, tagline } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (is_active !== undefined) updates.is_active = is_active;
    if (verification_status !== undefined) updates.verification_status = verification_status;
    if (theme_color !== undefined) updates.theme_color = theme_color;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    if (tagline !== undefined) updates.tagline = tagline;

    const { data: shop, error } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw { status: 500, error: 'Could not update shop' };

    res.json({ shop, message: 'Shop updated' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.delete('/api/shops/:id', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);

    await supabase.from('shops').delete().eq('id', req.params.id);
    res.json({ message: 'Shop deleted' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/products/:id/visibility', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { visible } = req.body;
    
    const { data } = await supabase.from('products').update({ visible }).eq('id', req.params.id).eq('shop_id', shop.id).select().single();
    res.json({ id: data.id, visible: data.visible, message: `Product ${visible ? 'visible' : 'hidden'}` });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/products', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { category, limit = 20, offset = 0 } = req.query;
    let query = supabase.from('products').select('*').eq('shop_id', shop.id).eq('status', 'active').order('created_at', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
    if (category) query = query.eq('category', category);
    const { data } = await query;
    res.json({ products: data.map(p => ({ id: p.id, name: p.title, description: p.description, price: p.price, currency: p.currency, category: p.category, image_url: p.image_url, video_url: p.video_url, available: p.available, stock: p.stock })), count: data.length });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { name, description, price, currency, stock, category, image_url, video_url } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name/price required' });
    
    const { data } = await supabase.from('products').insert({ shop_id: shop.id, title: name, description, price: Number(price), currency: currency || 'ETB', stock: Number(stock) || 0, category, image_url, video_url, available: true, status: 'active' }).select().single();
    res.status(201).json({ id: data.id, name: data.title, price: data.price });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { name, description, price, stock, category, image_url, video_url, visible } = req.body;
    
    const updates = {};
    if (name) updates.title = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) updates.stock = stock;
    if (category !== undefined) updates.category = category;
    if (image_url !== undefined) updates.image_url = image_url;
    if (video_url !== undefined) updates.video_url = video_url;
    if (visible !== undefined) updates.visible = visible;

    const { data } = await supabase.from('products').update(updates).eq('id', req.params.id).eq('shop_id', shop.id).select().single();
    res.json({ id: data.id, message: 'Product updated' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    await supabase.from('products').delete().eq('id', req.params.id).eq('shop_id', shop.id);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD & COMPRESSION
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    
    const compressed = await sharp(req.file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const filename = `${Date.now()}-${uuidv4()}.jpg`;
    
    const { data, error } = await supabase.storage.from('images').upload(`public/${filename}`, compressed, { contentType: 'image/jpeg' });
    if (error) throw { status: 500, error: 'Upload failed' };
    
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${data.path}`;
    res.json({ url, filename });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEOS (with approval workflow)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/videos', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { title, url, description } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });
    
    const { data } = await supabase.from('videos').insert({ shop_id: shop.id, title, url, description, status: 'pending' }).select().single();
    res.status(201).json({ id: data.id, status: 'pending', message: 'Video submitted for approval' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/videos', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { data } = await supabase.from('videos').select('*').eq('shop_id', shop.id).eq('status', 'approved').order('created_at', { ascending: false });
    res.json({ videos: data });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/videos/:id/status', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    const { data } = await supabase.from('videos').update({ status }).eq('id', req.params.id).select().single();
    res.json({ id: data.id, status: data.status, message: `Video ${status}` });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/orders', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { items, delivery_address, customer_name, customer_phone, utm_source } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Items required' });
    
    const { data: products } = await supabase.from('products').select('id, title, price, stock').in('id', items.map(i => i.product_id)).eq('shop_id', shop.id);
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const total = items.reduce((sum, item) => sum + (productMap[item.product_id].price * item.quantity), 0);
    
    const { data: order } = await supabase.from('orders').insert({ shop_id: shop.id, customer_name, customer_phone, delivery_address, total, status: 'pending', payment_status: 'unpaid', utm_source: utm_source || 'direct' }).select().single();
    await supabase.from('order_items').insert(items.map(item => ({ order_id: order.id, product_id: item.product_id, quantity: item.quantity, unit_price: productMap[item.product_id].price })));
    
    for (const item of items) {
      await supabase.from('products').update({ stock: productMap[item.product_id].stock - item.quantity }).eq('id', item.product_id);
    }
    
    await supabase.from('analytics_events').insert({ shop_id: shop.id, event_type: 'order_created', source: utm_source || 'direct', metadata: { order_id: order.id, total } });
    
    res.status(201).json({ order, message: 'Order placed' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { data } = await supabase.from('orders').select(`id, customer_name, customer_phone, delivery_address, total, status, payment_status, utm_source, created_at, order_items(quantity, unit_price, products(title, image_url))`).eq('shop_id', shop.id).order('created_at', { ascending: false });
    res.json({ orders: data });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    const { status } = req.body;
    
    const { data } = await supabase.from('orders').update({ status }).eq('id', req.params.id).eq('shop_id', shop.id).select().single();
    res.json({ id: data.id, status: data.status });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS (User List for Shop Owner)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/customers', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    
    const { data: customers } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, created_at')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    
    const unique = [...new Map(customers.map(c => [c.customer_phone, c])).values()];
    res.json({ customers: unique, count: unique.length });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING (Two-way: Customer ↔ Shop, Shop ↔ Super Admin)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/messages', async (req, res) => {
  try {
    const { recipient_id, message, type } = req.body; // type: "customer"|"admin"|"superadmin"
    const decoded = verifyAuth(req);
    if (!recipient_id || !message) return res.status(400).json({ error: 'Recipient and message required' });
    
    const { data } = await supabase.from('messages').insert({ sender_id: decoded.id, recipient_id, message, type, read: false }).select().single();
    res.status(201).json({ id: data.id, message: 'Message sent' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/messages/:recipientId', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${decoded.id},recipient_id.eq.${decoded.id}`).eq('recipient_id', req.params.recipientId).order('created_at', { ascending: true });
    res.json({ messages: data });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS (One-way alerts)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/notifications', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    const { recipient_id, title, body, video_url, video_title } = req.body;
    if (!recipient_id || !title || !body) return res.status(400).json({ error: 'All fields required' });
    
    const { data } = await supabase.from('notifications').insert({ sender_id: decoded.id, recipient_id, title, body, video_url: video_url || null, video_title: video_title || null, read: false }).select().single();
    res.status(201).json({ id: data.id, message: 'Notification sent' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    const { data } = await supabase.from('notifications').select('*').eq('recipient_id', decoded.id).eq('read', false).order('created_at', { ascending: false });
    res.json({ notifications: data, unread_count: data.length });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).eq('recipient_id', decoded.id);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS & UTM TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/analytics/track', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { event_type, source, metadata } = req.body;
    
    await supabase.from('analytics_events').insert({ shop_id: shop.id, event_type, source: source || 'direct', metadata });
    res.json({ message: 'Event tracked' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const shop = await getTenant(req);
    verifyAuth(req);
    
    const { data: orders } = await supabase.from('orders').select('total, status, created_at').eq('shop_id', shop.id);
    const { data: events } = await supabase.from('analytics_events').select('source, created_at').eq('shop_id', shop.id);
    
    const stats = {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + o.total, 0),
      pending_orders: orders.filter(o => o.status === 'pending').length,
      sources: Object.fromEntries([...new Set(events.map(e => e.source))].map(s => [s, events.filter(e => e.source === s).length]))
    };
    
    res.json(stats);
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS (Super Admin Controls)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/feature-flags', async (req, res) => {
  try {
    const decoded = verifyAuth(req);
    verifySuperAdmin(decoded);
    const { shop_id, feature, enabled } = req.body;
    if (!shop_id || !feature) return res.status(400).json({ error: 'Shop and feature required' });
    
    const { data } = await supabase.from('feature_flags').upsert({ shop_id, feature, enabled }).select().single();
    res.json({ feature: data.feature, enabled: data.enabled });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.get('/api/feature-flags/:feature', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { data } = await supabase.from('feature_flags').select('enabled').eq('shop_id', shop.id).eq('feature', req.params.feature).single();
    res.json({ feature: req.params.feature, enabled: data?.enabled || false });
  } catch (err) { res.json({ feature: req.params.feature, enabled: false }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/contact', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { message, customer_name, customer_phone } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    
    const { data } = await supabase.from('contact_messages').insert({ shop_id: shop.id, message: message.trim(), customer_name: customer_name || 'Anonymous', customer_phone, status: 'unread' }).select().single();
    res.status(201).json({ message: 'Message sent', id: data.id });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/payments/initiate/:orderId', async (req, res) => {
  try {
    const shop = await getTenant(req);
    const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.orderId).eq('shop_id', shop.id).single();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const tx_ref = `ESMARC-${shop.subdomain}-${order.id}-${Date.now()}`;
    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: order.total, currency: 'ETB', email: `${order.customer_phone}@esmarc.customer`, first_name: order.customer_name.split(' ')[0], phone_number: order.customer_phone, tx_ref, callback_url: `${process.env.API_BASE_URL}/api/payments/webhook`, return_url: `https://${shop.subdomain}.esmarc.com/order-success` })
    });
    
    const chapaData = await chapaResponse.json();
    if (chapaData.status !== 'success') return res.status(500).json({ error: 'Payment failed' });
    
    await supabase.from('orders').update({ payment_ref: tx_ref }).eq('id', order.id);
    res.json({ payment_url: chapaData.data.checkout_url, tx_ref });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { trx_ref, status } = req.body;
    if (!trx_ref || status !== 'success') return res.status(400).json({ error: 'Invalid' });
    
    const { data: order } = await supabase.from('orders').select('id').eq('payment_ref', trx_ref).single();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    await supabase.from('orders').update({ payment_status: 'paid', status: 'confirmed' }).eq('id', order.id);
    res.json({ message: 'Payment recorded' });
  } catch (err) { res.status(err.status || 500).json({ error: err.error }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' }));

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => console.log(`\n  ✅ Esmarc Complete API v2.0 running on port ${PORT}\n`));

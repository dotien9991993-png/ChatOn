const config = require('./config');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { supabaseAdmin } = require('./config/supabase');

const webhookRoutes = require('./routes/webhook');
const webhookOmsRoutes = require('./routes/webhook-oms');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const authFacebookRoutes = require('./routes/auth-facebook');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const teamRoutes = require('./routes/team');
const commentRoutes = require('./routes/comments');
const campaignRoutes = require('./routes/campaigns');
const livestreamRoutes = require('./routes/livestream');
const { startScheduler } = require('./jobs/campaign-scheduler');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { authLimiter, apiLimiter } = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);

// === Middleware ===
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// Log mọi request: method + url + timestamp
app.use((req, _res, next) => {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${time}] ${req.method} ${req.url}`);
  next();
});

// === Socket.IO ===
const io = new Server(server, {
  cors: { origin: config.frontendUrl, methods: ['GET', 'POST'] },
});

// Truyền io instance vào app để routes truy cập được
app.set('io', io);

io.on('connection', async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log('[Socket.IO] Client rejected — no token');
    socket.disconnect(true);
    return;
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.log('[Socket.IO] Client rejected — invalid token');
      socket.disconnect(true);
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      socket.disconnect(true);
      return;
    }

    const room = `tenant:${profile.tenant_id}`;
    socket.join(room);
    socket.tenantId = profile.tenant_id;
    socket.userId = user.id;
    console.log(`[Socket.IO] Client ${socket.id} joined ${room}`);

    // Mark agent online
    await supabaseAdmin
      .from('profiles')
      .update({ online_at: new Date().toISOString() })
      .eq('id', user.id);

    // Broadcast online status
    io.to(room).emit('agent_status', { agentId: user.id, online: true });
  } catch (err) {
    console.error('[Socket.IO] Auth error:', err.message);
    socket.disconnect(true);
    return;
  }

  // Heartbeat: update online_at periodically
  const heartbeat = setInterval(async () => {
    if (socket.userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ online_at: new Date().toISOString() })
        .eq('id', socket.userId)
        .then(() => {})
        .catch(() => {});
    }
  }, 2 * 60 * 1000); // every 2 minutes

  socket.on('disconnect', async () => {
    clearInterval(heartbeat);
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    if (socket.tenantId && socket.userId) {
      io.to(`tenant:${socket.tenantId}`).emit('agent_status', { agentId: socket.userId, online: false });
    }
  });
});

// === Routes ===
// Rate limiting on auth-related endpoints
app.use('/auth', authLimiter);
app.use('/api', apiLimiter);

// Unprotected: webhook + OAuth callback
app.use('/webhook/facebook', webhookRoutes);
app.use('/webhook/oms', webhookOmsRoutes);
app.use('/auth/facebook', authFacebookRoutes);

// Protected: API routes
app.use('/api/conversations', authMiddleware, conversationRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/facebook', authMiddleware, authFacebookRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/team', authMiddleware, teamRoutes);
app.use('/api/comments', authMiddleware, commentRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/livestream', authMiddleware, livestreamRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// Error handler (đặt cuối cùng)
app.use(errorHandler);

// === Start server ===
server.listen(config.port, () => {
  // Start campaign scheduler
  startScheduler(io);

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   ChatOn — Backend (Supabase)                ║
  ║   Server:  http://localhost:${config.port}            ║
  ║   Webhook: http://localhost:${config.port}/webhook/facebook  ║
  ╚══════════════════════════════════════════════╝
  `);
});

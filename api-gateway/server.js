require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Manual Preflight Handling (Crucial for Proxy overlap)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key,X-Internal-Token');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  next();
});

// 2. Dynamic CORS for standard requests
const corsOptions = {
  origin: (origin, callback) => {
    // This allows every origin that hits the gateway
    callback(null, true); 
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Internal-Token'],
};

app.use(cors(corsOptions));

// 3. Logging
app.use(morgan('[:date[iso]] [GATEWAY] :method :url -> :status | :response-time ms'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: 'running',
    timestamp: new Date().toISOString(),
    services: {
      'auth-service': process.env.AUTH_SERVICE_URL,
      'loan-service': process.env.LOAN_SERVICE_URL,
      'emi-service': process.env.EMI_SERVICE_URL,
      'wallet-service': process.env.WALLET_SERVICE_URL,
      'payment-service': process.env.PAYMENT_SERVICE_URL,
      'verification-service': process.env.VERIFICATION_SERVICE_URL,
      'admin-service': process.env.ADMIN_SERVICE_URL,
      'manager-service': process.env.MANAGER_SERVICE_URL,
    }
  });
});

// ── Proxy factory ─────────────────────────────────────────────────────────────
const generateProxyOptions = (pathPrefix, targetService) => {
  return createProxyMiddleware({
    target: targetService,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => path.replace(new RegExp(`^${pathPrefix}`), ''),
    on: {
      error: (err, req, res) => {
        console.error(`[Proxy Error] ${req.method} ${req.url} -> ${targetService}`, err.message);
        res.status(503).json({ error: 'Service unavailable', service: targetService, status: 503 });
      }
    }
  });
};

// ── Route table ───────────────────────────────────────────────────────────────
const routes = {
  '/api/auth':         process.env.AUTH_SERVICE_URL,
  '/api/admin/emi':    process.env.EMI_SERVICE_URL,
  '/api/loans':        process.env.LOAN_SERVICE_URL,
  '/api/customer':     process.env.LOAN_SERVICE_URL,
  '/api/emi':          process.env.EMI_SERVICE_URL,
  '/api/wallet':       process.env.WALLET_SERVICE_URL,
  '/api/transactions': process.env.WALLET_SERVICE_URL,
  '/api/payments':     process.env.PAYMENT_SERVICE_URL,
  '/api/verification': process.env.VERIFICATION_SERVICE_URL,
  '/api/admin':        process.env.ADMIN_SERVICE_URL,
  '/api/support':      process.env.ADMIN_SERVICE_URL,
  '/api/manager':      process.env.MANAGER_SERVICE_URL,
};

for (const [pathPrefix, targetUrl] of Object.entries(routes)) {
  if (targetUrl) {
    app.use(pathPrefix, generateProxyOptions(pathPrefix, targetUrl));
  } else {
    console.warn(`[WARNING] No URL configured for ${pathPrefix}`);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway is running on http://localhost:${PORT}`);
  console.log(`CORS is configured to dynamically allow all incoming origins.`);
});
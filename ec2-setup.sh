#!/bin/bash
# Run this once on EC2: bash ec2-setup.sh
set -e

BACKEND_DIR="/home/ec2-user/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Cactus Intelligence — EC2 Setup    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Pull latest code ───────────────────────────────────────
echo "→ Pulling latest code from GitHub..."
cd "$BACKEND_DIR"
git pull origin main

# ── 2. Install dependencies ───────────────────────────────────
echo "→ Installing dependencies..."
npm install

# ── 3. Build TypeScript ───────────────────────────────────────
echo "→ Building TypeScript..."
npm run build

# ── 4. Seed DB (adds ai_provider / ai_model settings) ─────────
echo "→ Seeding database settings..."
node dist/db/seed.js || echo "  (seed skipped — admin user already exists)"

# ── 5. Fix Nginx timeout for long AI calls ────────────────────
echo "→ Updating Nginx timeouts..."
NGINX_CONF="/etc/nginx/nginx.conf"

# Add timeout lines if not already present
if ! grep -q "proxy_read_timeout 300s" "$NGINX_CONF"; then
  sudo sed -i 's|proxy_pass http://localhost:4000;|proxy_pass http://localhost:4000;\n            proxy_read_timeout 300s;\n            proxy_connect_timeout 10s;\n            proxy_send_timeout 300s;|' "$NGINX_CONF"
  echo "  Timeouts added to Nginx config."
else
  echo "  Nginx timeouts already set, skipping."
fi

sudo nginx -t && sudo systemctl reload nginx
echo "  Nginx reloaded."

# ── 6. Restart PM2 ───────────────────────────────────────────
echo "→ Restarting backend..."
pm2 restart cactus-api
pm2 save

echo ""
echo "✅ Setup complete!"
echo ""
echo "Server status:"
pm2 status

echo ""
echo "Test it: curl http://localhost:4000/api/auth/me"
echo "Public:  curl http://3.26.7.79/api/auth/me"
echo ""
echo "Next: Go to https://cactus-b40b1.web.app → Admin → AI Model → select provider → Save"
echo ""

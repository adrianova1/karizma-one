#!/bin/bash
set -e

echo "=========================================="
echo "🚀 [Karizma Center] Automated Fast Deploy"
echo "=========================================="

# Ensure script runs from project root
cd "$(dirname "$0")"

# 1. Fix IPv6 routing hang & DNS timeouts on Linux VPS (common cause of npm hanging on spinner in Iran)
if [ "$(id -u)" -eq 0 ]; then
  echo "🔧 Optimizing network stack (disabling broken IPv6 routes & setting Shecan DNS)..."
  sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1 || true
  sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1 || true
  # Set fast DNS servers (Shecan anti-sanction + Cloudflare)
  echo -e "nameserver 178.22.122.100\nnameserver 185.51.200.2\nnameserver 1.1.1.1\nnameserver 8.8.8.8" > /etc/resolv.conf 2>/dev/null || true
fi

# 2. Configure ultra-fast, uncensored mirror
echo "📦 Configuring high-speed registry mirror (npmmirror)..."
npm config set registry https://registry.npmmirror.com
npm config set audit false
npm config set fund false

# 3. Clean stale node_modules if requested or if corrupted
if [ "$1" == "--clean" ]; then
  echo "🧹 Cleaning previous node_modules and cache..."
  rm -rf node_modules package-lock.json
fi

# 4. Pull latest git commits if running inside a git repo
if [ -d ".git" ]; then
  echo "📥 Pulling latest updates from git repository..."
  git pull origin main 2>/dev/null || git pull 2>/dev/null || true
fi

# 5. Install production packages (skips heavy browser databases like baseline-browser-mapping)
echo "⚡ Installing production packages..."
npm install --omit=dev --ignore-scripts

# 6. Check if pre-built bundle exists or build if necessary
if [ -f "dist/server.cjs" ] && [ -f "dist/index.html" ]; then
  echo "✅ Pre-built production bundle detected from Git! Zero build time required."
else
  echo "🔨 Pre-built files not found, installing build tools and compiling..."
  npm install --ignore-scripts
  npm run build
fi

# 7. Process management with PM2
if command -v pm2 >/dev/null 2>&1; then
  echo "🔄 Starting/Reloading service in PM2..."
  pm2 delete karizma >/dev/null 2>&1 || true
  pm2 start dist/server.cjs --name karizma
  pm2 save >/dev/null 2>&1 || true
  echo "=========================================="
  echo "✅ Karizma Center is LIVE and running on port 3000!"
  echo "=========================================="
  pm2 status karizma
else
  echo "=========================================="
  echo "✅ Build completed! Start the server with:"
  echo "   npm run start"
  echo "=========================================="
fi

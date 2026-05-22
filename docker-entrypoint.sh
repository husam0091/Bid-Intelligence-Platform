#!/bin/sh
set -e

echo "[blackbid] Running database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "[blackbid] Starting application on port ${PORT:-3000}..."
exec node server.js

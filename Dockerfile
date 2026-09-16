# Stage 1: Build Frontend and Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation on Alpine musl
RUN apk add --no-cache python3 make g++

# Copy dependency configs
COPY package*.json ./
RUN npm ci

# Copy full workspace files
COPY . .

# Run build tasks (outputs client static build and bundled server.cjs CJS bundle)
RUN npm run build

# Stage 2: Production Container
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install build dependencies for better-sqlite3 native compilation on Alpine musl
RUN apk add --no-cache python3 make g++

# Copy output bundles and persistent data from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Expose port 3000
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]

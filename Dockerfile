# Stage 1: Development (used by docker-compose for local hot-reload)
FROM node:20-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start:dev"]

# Stage 2: Production Dependencies (clean, no devDependencies)
FROM node:20-alpine AS prod-deps

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: Build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

COPY --from=development /usr/src/app/node_modules ./node_modules

COPY . .

RUN npm run build

# Stage 4: Production (Ultra-lightweight & hardened)
FROM node:20-alpine AS production

# Security patch OS packages (updates OpenSSL, libssl3, etc.)
# npm and corepack are NOT needed at runtime - only 'node dist/main' is executed
RUN apk upgrade --no-cache \
    && npm uninstall -g npm corepack \
    && rm -rf /root/.npm

WORKDIR /usr/src/app

# Copy artifacts assigning non-root user permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root user for security compliance
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

EXPOSE 3000

CMD ["node", "dist/main"]

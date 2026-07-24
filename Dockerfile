# Stage 1: Development 
FROM node:24-trixie-slim AS development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start:dev"]

# Stage 2: Production Dependencies (clean, no devDependencies)
FROM node:24-trixie-slim AS prod-deps

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 3: Build
FROM node:24-trixie-slim AS build

WORKDIR /usr/src/app

COPY package*.json ./

COPY --from=development /usr/src/app/node_modules ./node_modules

COPY . .

RUN npm run build

# Stage 4: Production
FROM gcr.io/distroless/nodejs24-debian13 AS production

WORKDIR /usr/src/app

# Copy artifacts assigning nonroot user permissions
COPY --chown=nonroot:nonroot package*.json ./
COPY --chown=nonroot:nonroot --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=nonroot:nonroot --from=build /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

# Run as nonroot user for security compliance
USER nonroot

EXPOSE 3000

# Distroless Node image has 'node' as entrypoint
CMD ["dist/main"]

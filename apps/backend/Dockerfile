# ─────────────── Backend ───────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl curl && addgroup -S nodejs && adduser -S nodejs -G nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:3001/api/health || exit 1
CMD ["node", "dist/main.js"]

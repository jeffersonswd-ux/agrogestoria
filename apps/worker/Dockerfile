FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S nodejs && adduser -S nodejs -G nodejs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
USER nodejs
CMD ["node", "dist/index.js"]

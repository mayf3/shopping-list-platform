FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/shopping-list.db
ENV NODE_OPTIONS=--max-old-space-size=384

RUN apk add --no-cache dumb-init

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/schema ./schema

VOLUME ["/data"]
EXPOSE 3001

CMD ["dumb-init", "node", "server/dist/index.js"]

FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
CMD ["npm", "start"]


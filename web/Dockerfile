FROM node:20-slim AS base
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline || npm install

COPY . .

# Pre-populate SWC binary cache from bundled node_modules (avoids CDN download on corp networks)
RUN mkdir -p /root/.cache/next-swc && \
    find /app/node_modules -name "*.node" -path "*next-swc*" -exec cp {} /root/.cache/next-swc/ \; || true && \
    find /app/node_modules -name "next-swc.linux-x64-gnu.node" -exec cp {} /root/.cache/next-swc/ \; 2>/dev/null || true

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]


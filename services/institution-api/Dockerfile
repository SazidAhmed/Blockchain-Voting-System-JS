# Institution API Dockerfile

FROM node:20-alpine

WORKDIR /app

# System deps first for better layer caching
RUN apk add --no-cache wget

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

USER appuser

ARG PORT=4000
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:$PORT/api/health || exit 1

CMD ["node", "src/server.js"]

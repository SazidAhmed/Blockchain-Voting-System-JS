# Blockchain Node Dockerfile
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ wget && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

# Expose port
ARG PORT=3001
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:$PORT/node || exit 1

# Start application
CMD ["npm", "start"]

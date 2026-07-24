# Admin Panel Dockerfile (Development)

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
ARG PORT=5174
EXPOSE $PORT

# Start development server
CMD npm run dev -- --host 0.0.0.0 --port $PORT

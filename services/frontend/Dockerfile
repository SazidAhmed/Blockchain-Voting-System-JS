# Frontend Dockerfile (Development)

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
ARG PORT=5173
EXPOSE $PORT

# Start development server
CMD npm run dev -- --host 0.0.0.0 --port $PORT

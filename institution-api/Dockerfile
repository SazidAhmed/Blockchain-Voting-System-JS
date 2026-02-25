FROM node:18-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["node", "index.js"]

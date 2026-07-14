FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

RUN apk add --no-cache wget

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]

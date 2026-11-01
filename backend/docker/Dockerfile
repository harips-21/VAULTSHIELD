FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL 1.1 and other build dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

# Clear any cached Prisma binaries and regenerate for Alpine
RUN rm -rf node_modules .prisma
RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build


FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 1.1 runtime dependency for Prisma query engine
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and regenerate Prisma binaries for Alpine platform
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
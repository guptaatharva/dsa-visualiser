# Install dependencies only when needed
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 py3-pip
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely static files into .next/static
RUN npm run build || true

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV development
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "run", "dev"] 
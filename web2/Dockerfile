# Build stage
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm
# This layer is cached if package.json and pnpm-lock.yaml don't change
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm run build

# Runtime stage
FROM node:22-slim

# Install pnpm in runtime stage
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built assets from Nitro's .output directory
COPY --from=builder /app/.output ./
COPY --from=builder /app/package.json ./

# Expose the port
EXPOSE 3000

ENV ORIGIN=https://tanly.app

# Start the Nitro server
CMD ["node", "server/index.mjs"]
# Development build - simpler for now
FROM node:20-alpine
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for dev mode)
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit --silent; else npm install --prefer-offline --no-audit --silent; fi

# Copy source code
COPY . .

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Use dev mode for hot reloading and better error messages
CMD ["npm", "run", "dev"]


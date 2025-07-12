# Use official Playwright image with Chromium pre-installed
# Updated to match playwright package version 1.54.1
FROM mcr.microsoft.com/playwright:v1.54.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev deps for TypeScript build)
RUN npm ci

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (Render sets PORT env variable)
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
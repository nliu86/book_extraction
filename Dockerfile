# Use official Playwright image with Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Build TypeScript
RUN npm run build

# Expose port (Render sets PORT env variable)
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
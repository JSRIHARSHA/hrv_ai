# Multi-stage Docker build for Order Management Application
# Stage 1: Build React frontend
FROM node:16-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the React app
RUN npm run build

# Stage 2: Backend with Python support
FROM node:16-alpine

# Install Python and system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    gcc \
    g++ \
    make \
    libffi-dev \
    musl-dev \
    linux-headers

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend-package.json package.json

# Install Node.js dependencies
RUN npm ci --only=production

# Copy backend server file
COPY server.js ./

# Copy Python files
COPY universal_pdf_extractor.py ./
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/build ./build

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 755 uploads

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY web/package*.json ./
RUN npm install

# Copy configuration and source files
COPY web/tailwind.config.js ./
COPY web/postcss.config.js ./
COPY web/vite.config.js ./
COPY web/index.html ./
COPY web/src ./src/

# Expose Vite dev port
EXPOSE 5173

# Start Vite with --host flag so it binds to 0.0.0.0
CMD ["npm", "run", "dev:frontend", "--", "--host"]

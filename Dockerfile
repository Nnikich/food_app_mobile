FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy configuration and source files
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY vite.config.js ./
COPY index.html ./
COPY src ./src/

# Expose Vite dev port
EXPOSE 5173

# Start Vite with --host flag so it binds to 0.0.0.0
CMD ["npm", "run", "dev:frontend", "--", "--host"]

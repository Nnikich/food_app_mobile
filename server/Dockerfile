FROM node:20-slim

WORKDIR /app

# Install system dependencies required by Prisma engine
RUN apt-get update -y && apt-get install -y openssl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma Client
RUN npx prisma generate

# Expose backend port
EXPOSE 3001

# Command to run database schema sync and start application
CMD ["sh", "-c", "npx prisma db push && npx tsx src/index.ts"]

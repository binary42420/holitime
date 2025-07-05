FROM node:20-slim
  
       # Install system dependencies
       RUN apt-get update && apt-get install -y \
           python3 \
           make \
           g++ \
           && rm -rf /var/lib/apt/lists/*
  
       # Set working directory
       WORKDIR /app
  
       # Copy package files
     COPY package.json package-lock.json* ./

     # Install dependencies
     RUN npm ci --legacy-peer-deps --no-audit --no-fund

     # Copy CA certificate into the container
     COPY certs/ca.pem /app/certs/ca.pem

     # Copy source code
     COPY . .

     # Set environment variables
     ENV NODE_ENV=production
     ENV NEXT_TELEMETRY_DISABLED=1
     ENV DATABASE_CA_CERT=/app/certs/ca.pem

     # Build the application
     RUN npm run build

     # Create user
     RUN groupadd --gid 1001 nodejs && \
         useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs
     # Change ownership
     RUN chown -R nextjs:nodejs /app

     # Switch to non-root user
     USER nextjs

     # Expose port
     EXPOSE 3000

     # Set runtime environment
     ENV PORT=3000
     ENV HOSTNAME="0.0.0.0"

     # Start the application
     CMD ["npm", "start"]

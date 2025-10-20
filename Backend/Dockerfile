# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the backend source
COPY . .

# Expose backend port
EXPOSE 5000

# Default command
CMD ["npm", "start"]

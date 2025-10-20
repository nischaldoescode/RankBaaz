# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (only production if needed)
RUN npm install --production

# Copy the rest of the backend source
COPY . .

# Expose your backend port
EXPOSE 5000

# Default command
CMD ["npm", "start"]

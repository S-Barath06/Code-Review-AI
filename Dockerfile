FROM node:18-bullseye

# Install compilers: Java (default-jdk), C++ (g++), Python3
RUN apt-get update && \
    apt-get install -y default-jdk g++ python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

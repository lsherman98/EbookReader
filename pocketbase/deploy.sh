#!/bin/bash
# filepath: /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/deploy.sh

set -e

# Build Docker image
docker build -t pocketbase-app .

# Create temp container
docker create --name pocketbase-temp pocketbase-app

# Copy built binary out
docker cp pocketbase-temp:/server ./server

# Remove temp container
docker rm pocketbase-temp

# Rsync to remote server
rsync -avz -e ssh /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/server root@162.243.70.98:/root/pb/

# Rsync pb_public folder to remote server
rsync -avz -e ssh /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/pb_public/ root@162.243.70.98:/root/pb/pb_public/

# Rsync .env file to remote server
rsync -avz -e ssh /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/.env root@162.243.70.98:/root/pb/.env

# Restart pocketbase.service on remote server
ssh root@162.243.70.98 'systemctl restart pocketbase.service'
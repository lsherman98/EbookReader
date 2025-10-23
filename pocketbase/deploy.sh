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

PASSWORD="8RWTJH1ezsQ^WzMw"

# Rsync to remote server
rsync -avz -e "sshpass -p $PASSWORD ssh" /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/server root@162.243.186.51:/root/reader/

# Rsync pb_public folder to remote server
rsync -avz -e "sshpass -p $PASSWORD ssh" /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/pb_public/ root@162.243.186.51:/root/reader/pb_public/

# Rsync .env file to remote server
rsync -avz -e "sshpass -p $PASSWORD ssh" /Users/levisherman/Documents/code/projects/ai-reader/pocketbase/.env root@162.243.186.51:/root/reader/.env

# Restart pocketbase.service on remote server
sshpass -p $PASSWORD ssh root@162.243.186.51 'systemctl restart reader.service'
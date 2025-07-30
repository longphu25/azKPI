#!/bin/bash

# Use Node.js version 22 with nvm
if [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 22
fi

node -v
npm -v
pnpm -v

pnpm install

# https://orange-cloud-285.notion.site/H-ng-D-n-S-D-ng-GitHub-Codespace-Docker-Ch-y-Sui-CLI-22302097eadf80d29ab7ea57f54e2c5b

docker pull mysten/sui-tools:testnet

# Check if the container 'suidevcontainer' is exist remove it
if docker ps -a --format '{{.Names}}' | grep -q '^suidevcontainer$'; then
    echo "Removing existing container 'suidevcontainer'..."
    docker rm -f suidevcontainer
else
    echo "No existing container 'suidevcontainer' found."
fi

docker run --name suidevcontainer -it \
    -v "$(pwd)":/sui \
    -v "$(pwd)/wallet/sui_config:/root/.sui/sui_config" \
    mysten/sui-tools:testnet

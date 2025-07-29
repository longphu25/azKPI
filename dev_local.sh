#!/bin/bash

# Use Node.js version 22 with nvm
if [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 22
fi

pnpm install

# https://orange-cloud-285.notion.site/H-ng-D-n-S-D-ng-GitHub-Codespace-Docker-Ch-y-Sui-CLI-22302097eadf80d29ab7ea57f54e2c5b

docker pull mysten/sui-tools:testnet

# Check if the container 'suidevcontainer' is not running or does not exist, then run it
if ! docker ps -a --format '{{.Names}}' | grep -q '^suidevcontainer$'; then
    docker run --name suidevcontainer -it -v "$(pwd)":/project mysten/sui-tools:testnet
else
    echo "Container 'suidevcontainer' already exists."
    docker start -ai suidevcontainer
fi
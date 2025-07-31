#!/bin/bash

SYSTEM=macos-x86_64
if [ ! -f site-builder ]; then
    curl https://storage.googleapis.com/mysten-walrus-binaries/site-builder-testnet-latest-$SYSTEM -o site-builder
    chmod +x site-builder
else
    echo "Using existing site-builder binary"
fi

if [ ! -d ~/.config/walrus ]; then
    echo "Creating ~/.config/walrus directory"
    mkdir -p ~/.config/walrus
fi

if [ ! -f ~/.config/walrus/sites-config.yaml ]; then
    echo "Downloading sites-config.yaml"
    curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml -o ~/.config/walrus/sites-config.yaml
else
    echo "Using existing sites-config.yaml"
fi  

if [ -d dist ]; then
    ./site-builder deploy ./dist --wallet=./wallet/sui_config --epochs 1 
else
    echo "dist folder does not exist. Please build your site first."
    exit 1
fi
# ./site-builder --config ~/.config/walrus/sites-config.yaml --site azkpi --output ./site_deploy_walrus.sh
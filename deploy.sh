#!/bin/bash

# Deployment script for Task Manager contracts

echo "🚀 Deploying Task Manager Contracts..."

# Deploy Counter Contract (for testing)
echo "📝 Building and deploying Counter contract..."
cd move/counter
sui move build
COUNTER_PACKAGE_ID=$(sui client publish --gas-budget 10000000 --json | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
echo "✅ Counter deployed with Package ID: $COUNTER_PACKAGE_ID"
cd ../..

# Deploy Task Manager Contract  
echo "📋 Building and deploying Task Manager contract..."
cd move/task_manager
sui move build
TASK_MANAGER_PACKAGE_ID=$(sui client publish --gas-budget 10000000 --json | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
echo "✅ Task Manager deployed with Package ID: $TASK_MANAGER_PACKAGE_ID"
cd ../..

# Update constants file
echo "🔄 Updating constants.ts..."
cat > src/constants.ts << EOF
export const DEVNET_COUNTER_PACKAGE_ID = "$COUNTER_PACKAGE_ID";
export const TESTNET_COUNTER_PACKAGE_ID = "$COUNTER_PACKAGE_ID";
export const MAINNET_COUNTER_PACKAGE_ID = "$COUNTER_PACKAGE_ID";

export const DEVNET_TASK_MANAGER_PACKAGE_ID = "$TASK_MANAGER_PACKAGE_ID";
export const TESTNET_TASK_MANAGER_PACKAGE_ID = "$TASK_MANAGER_PACKAGE_ID";
export const MAINNET_TASK_MANAGER_PACKAGE_ID = "$TASK_MANAGER_PACKAGE_ID";
EOF

echo "📄 Package IDs saved to constants.ts"
echo "🎉 Deployment complete!"
echo ""
echo "Counter Package ID: $COUNTER_PACKAGE_ID"
echo "Task Manager Package ID: $TASK_MANAGER_PACKAGE_ID"
echo ""
echo "Next steps:"
echo "1. Update networkConfig.ts to include taskManagerPackageId"
echo "2. Run 'pnpm dev' to start the development server"
echo "3. Connect your wallet and start creating tasks!"

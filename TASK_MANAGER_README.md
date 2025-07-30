# azKPI - Task Management with Walrus Integration

A decentralized task management system built on Sui blockchain with secure content and file storage using Walrus and Seal for encryption.

## Features

### 🔐 Secure Task Management
- Create tasks with encrypted content and file attachments
- Content and files are encrypted using Seal and stored on Walrus
- Access control managed via Sui smart contracts

### 🤝 Task Sharing
- Share tasks with specific users by wallet address
- Only authorized users can decrypt and view task content
- Granular access control through blockchain verification

### 📁 File Management
- Upload multiple files per task
- Files are encrypted before storage on Walrus
- Download and decrypt files with proper access permissions

### 🌐 Decentralized Storage
- Content stored on Walrus decentralized storage network
- No central server dependencies
- Redundant storage across multiple nodes

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │───▶│   Sui Blockchain │───▶│ Walrus Storage  │
│                 │    │                  │    │                 │
│ - Task UI       │    │ - Smart Contract │    │ - Encrypted     │
│ - File Upload   │    │ - Access Control │    │   Content       │
│ - Sharing       │    │ - Events         │    │ - File Storage  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         │              ┌─────────▼─────────┐
         └─────────────▶│   Seal Service    │
                        │                   │
                        │ - Encryption      │
                        │ - Key Management  │
                        │ - Decryption      │
                        └───────────────────┘
```

## Smart Contract Functions

### Task Creation
- `create_task(title, description)` - Create a new task
- `add_content(task, content_blob_id)` - Add encrypted content
- `add_files(task, file_blob_ids)` - Add encrypted files

### Access Control  
- `share_task(task, users)` - Share task with specific users
- `verify_access(task)` - Verify user access for decryption
- `has_access(task, user)` - Check if user has access

### Task Management
- `complete_task(task)` - Mark task as completed
- Getter functions for task metadata

## Setup Instructions

### Prerequisites
- Node.js 18+
- pnpm or npm
- Sui CLI
- Sui wallet (e.g., Sui Wallet browser extension)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Deploy Smart Contracts

#### Deploy Counter Contract (for testing)
```bash
cd move/counter
sui move build
sui client publish --gas-budget 10000000
```

#### Deploy Task Manager Contract
```bash
cd move/task_manager  
sui move build
sui client publish --gas-budget 10000000
```

### 3. Update Configuration

Update `src/constants.ts` with your deployed package IDs:
```typescript
export const TESTNET_COUNTER_PACKAGE_ID = "0x<your_counter_package_id>";
// Add task manager package ID when deployed
```

Update `src/networkConfig.ts` to include task manager package ID:
```typescript
const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
        taskManagerPackageId: TESTNET_TASK_MANAGER_PACKAGE_ID, // Add this
      },
    },
    // ... other networks
  });
```

### 4. Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

## Usage Guide

### Creating Tasks
1. Connect your Sui wallet
2. Navigate to "Create Task" tab
3. Enter title and description
4. Click "Create Task"

### Adding Content and Files
1. Select a task from "My Tasks"
2. Go to "Add Content & Files" tab
3. Enter content and/or select files
4. Choose a Walrus service
5. Click "Encrypt & Upload to Walrus"

### Sharing Tasks
1. Select a task to manage
2. Go to "Share Task" tab  
3. Enter wallet addresses (comma-separated)
4. Click "Share Task"

### Viewing Shared Tasks
1. Navigate to a task you have access to
2. Click "View Content & Download Files"
3. Sign the message to decrypt content
4. View content and download files

## Technical Details

### Encryption Flow
1. Content/files are encrypted client-side using Seal
2. Encrypted data is uploaded to Walrus storage
3. Walrus blob IDs are stored in Sui smart contract
4. Access control enforced by smart contract verification

### Decryption Flow
1. User requests access to task content
2. Smart contract verifies user permissions
3. Seal key servers provide decryption keys
4. Content is decrypted client-side
5. Files available for download

### Walrus Integration
- Multiple aggregator/publisher endpoints for redundancy
- Configurable service selection
- Automatic retry on failed uploads
- 1 epoch storage duration (configurable)

## Development

### Project Structure
```
src/
├── components/
│   ├── CreateTask.tsx           # Task creation UI
│   ├── TaskContentUpload.tsx    # Content & file upload
│   ├── TaskSharing.tsx          # Task sharing UI
│   ├── TaskViewer.tsx           # View & download content
│   └── TaskManager.tsx          # Main task management
├── move/
│   ├── counter/                 # Demo counter contract
│   └── task_manager/            # Task management contract
└── ...
```

### Key Dependencies
- `@mysten/sui` - Sui blockchain interaction
- `@mysten/dapp-kit` - Sui dApp utilities  
- `@mysten/seal` - Encryption and key management
- `@mysten/walrus` - Decentralized storage
- `@radix-ui/themes` - UI components

## Security Considerations

### Access Control
- Smart contract enforces access permissions
- Users can only decrypt content they have access to
- Task creators control sharing permissions

### Encryption
- Client-side encryption using Seal's BLS12-381 cryptography
- Secret sharing across multiple key servers
- Content never stored unencrypted on servers

### Storage
- Walrus provides redundant, decentralized storage
- No single point of failure
- Content availability across multiple nodes

## Troubleshooting

### Common Issues

**"Failed to upload to Walrus"**
- Try selecting a different Walrus service
- Check network connectivity
- Ensure file size is under 10MB

**"No access to decryption keys"**  
- Verify you have access to the task
- Check if task was shared with your wallet address
- Ensure you're using the correct wallet

**"Task creation failed"**
- Check wallet has sufficient SUI for gas
- Verify smart contract deployment
- Check console for detailed error messages

### Getting Help
- Check browser console for detailed error logs
- Verify all dependencies are properly installed
- Ensure wallet is connected to Testnet
- Test with the counter demo first

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

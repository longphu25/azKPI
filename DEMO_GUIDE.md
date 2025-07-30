# Task Manager Demo Instructions

## Quick Start Guide

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Deploy Contracts (Optional - for your own instance)
```bash
./deploy.sh
```

Or use the existing deployed contracts by updating constants.ts.

### 3. Start Development Server
```bash
pnpm dev
```

### 4. Connect Wallet
- Install Sui Wallet browser extension
- Switch to Testnet
- Get testnet SUI from faucet: https://faucet.sui.io/

### 5. Demo Workflow

#### Create a Task
1. Go to "Create Task" tab
2. Enter title: "Project Planning"
3. Enter description: "Plan the next sprint features"
4. Click "Create Task"

#### Add Content and Files
1. Select the created task from "My Tasks"
2. Go to "Add Content & Files" tab
3. Enter content: "Sprint goals: 1. User authentication, 2. File upload, 3. Sharing system"
4. Select some files (images, documents)
5. Choose a Walrus service
6. Click "Encrypt & Upload to Walrus"

#### Share the Task
1. Go to "Share Task" tab
2. Enter wallet addresses of team members (comma-separated)
3. Click "Share Task"

#### View Shared Task (from another wallet)
1. Switch to a different wallet that was shared with
2. Go to "Shared With Me" tab
3. Click "View Task" on the shared task
4. Click "View Content & Download Files"
5. Sign the message to decrypt
6. View content and download files

## Key Features Demonstrated

### 🔐 End-to-End Encryption
- All content encrypted before upload
- Only authorized users can decrypt
- Cryptographic access control

### 🌐 Decentralized Storage  
- Files stored on Walrus network
- No central server dependencies
- Redundant storage across nodes

### 🤝 Secure Sharing
- Blockchain-based access control
- Granular permissions per task
- Revocable access (future feature)

### 📱 User-Friendly Interface
- Intuitive task management
- Seamless encryption/decryption
- Real-time updates

## Technical Architecture

### Smart Contract Layer
- Task metadata on Sui blockchain
- Access control verification
- Event emission for UI updates

### Encryption Layer (Seal)
- Client-side encryption/decryption
- Secret sharing across key servers
- BLS12-381 cryptography

### Storage Layer (Walrus)
- Decentralized blob storage
- Multiple aggregator/publisher nodes
- Configurable redundancy

### Frontend Layer
- React with TypeScript
- Radix UI components
- Real-time blockchain interaction

## Error Handling

### Common Issues & Solutions

**"Failed to upload to Walrus"**
- Solution: Try a different Walrus service from dropdown

**"No access to decryption keys"**
- Solution: Ensure task was shared with your wallet address

**"Transaction failed"**
- Solution: Check wallet has sufficient SUI for gas fees

**"Content not loading"**
- Solution: Wait for Walrus network propagation (may take a few seconds)

## Production Considerations

### Scalability
- Paginated task lists for large datasets
- Background sync for shared tasks
- Caching for frequently accessed content

### Security
- Key rotation mechanisms
- Access audit trails
- Secure key server infrastructure

### User Experience
- Offline content caching
- Progressive file upload
- Real-time collaboration features

## Next Steps

### Possible Enhancements
1. **Task Templates** - Predefined task structures
2. **Collaborative Editing** - Real-time content editing
3. **File Versioning** - Track content changes over time
4. **Access Analytics** - Monitor task access patterns
5. **Mobile App** - Native mobile interface
6. **Integration APIs** - Connect with external tools

### Production Deployment
1. **Custom Walrus Nodes** - Run dedicated storage infrastructure
2. **CDN Integration** - Optimize content delivery
3. **Monitoring** - Track system health and performance
4. **Backup Systems** - Ensure data redundancy

This demo showcases the power of combining Sui's smart contracts, Seal's encryption, and Walrus's storage for secure, decentralized task management.

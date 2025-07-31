# azKPI — Decentralized Task Management Platform

## Overview

azKPI is a decentralized task management solution powered by the Sui blockchain, designed for individuals and organizations seeking transparency, security, and privacy in managing their workflows. The system integrates **Walrus** for decentralized file/content storage and **Seal** for robust content encryption, ensuring both on-chain data integrity and off-chain privacy.

## 🚀 Current Implementation Status

### ✅ **Completed Features**

- **Task Creation & Management**: Full CRUD operations with priority levels and due dates
- **Secure File Upload**: Client-side encryption using Seal before Walrus storage
- **Task Sharing**: Granular access control with wallet address-based permissions
- **Content Decryption**: End-to-end encrypted content viewing with proper key management
- **Walrus Integration**: Multi-aggregator redundancy for reliable file storage/retrieval
- **Sui Blockchain Integration**: Smart contract-based access control and task metadata

### 🔧 **Recent SEAL Integration Fixes**

- **Improved SessionKey Management**: 30-minute TTL with proper error handling
- **Enhanced SealClient Configuration**: Automatic fallback configurations for reliability
- **Optimized Decryption Flow**: Separated `fetchKeys` and `decrypt` operations following official patterns
- **Better Error Handling**: Specific error messages and retry mechanisms
- **Batch Processing**: Efficient key fetching (≤10 per batch) with rate limiting compliance

## Purpose and Goals

- **Decentralized Workflow**: Enable collaborative task management without centralized control or single points of failure
- **Secure Storage & Privacy**: Utilize Walrus and Seal technologies for encrypted, secure off-chain content storage
- **Immutable Audit Trails**: Leverage Sui blockchain for tamper-proof task creation, updates, and completion records
- **Seamless User Experience**: Provide intuitive interfaces for individuals and teams to manage tasks effectively
- **Integration Readiness**: Enable future API-level integrations with third-party systems and dApps

## Key Features

### 🎯 **Task Management Core**

- **Task Creation**: Create tasks with title, description, priority levels (Low/Medium/High/Critical), and due dates
- **Content & File Attachments**: Upload and encrypt multiple files per task using Seal encryption
- **Task Sharing**: Share tasks with specific users via wallet addresses with granular access control
- **Status Tracking**: Track task completion status and overdue indicators
- **Secure Access**: Only task creators and shared users can decrypt and view task content

### ⛓️ **Sui Blockchain Integration**

- **Smart Contract Access Control**: On-chain verification of user permissions via `seal_approve` function
- **Immutable Task Metadata**: Task information stored on-chain with tamper-proof records
- **Wallet-Based Authentication**: Native Sui wallet integration for secure identity management
- **Gas-Efficient Operations**: Optimized smart contract calls for cost-effective task management

### 🔐 **Walrus & Seal Integration**

- **Client-Side Encryption**: All content encrypted using Seal's BLS12-381 cryptography before upload
- **Decentralized Storage**: Files stored on Walrus with multi-aggregator redundancy
- **Identity-Based Encryption (IBE)**: Advanced encryption allowing granular access control
- **Key Server Distribution**: Distributed key management across multiple servers for security
- **Threshold Encryption**: 2-out-of-N key server setup with automatic fallback to 1-out-of-N

### 💻 **User Interface & Experience**

- **Responsive Web App**: Modern React-based UI with mobile-friendly design
- **Wallet Integration**: Seamless connection with Sui wallets for authentication
- **File Type Detection**: Automatic MIME type detection with inline image viewing
- **Real-Time Feedback**: Loading states and detailed error messages for better UX
- **Batch Operations**: Efficient handling of multiple file uploads and downloads

### 🔒 **Security & Compliance**

- **End-to-End Encryption**: All data encrypted using Seal with BLS12-381 cryptography
- **Zero-Knowledge Privacy**: Content never accessible to unauthorized parties
- **Blockchain Verification**: Access control enforced via smart contracts
- **Audit Trail**: All task operations recorded on-chain for transparency and accountability

## 🛠️ Technical Stack

### **Blockchain & Smart Contracts**

- **Sui Blockchain**: High-performance blockchain for task metadata and access control
- **Move Language**: Smart contracts written in Sui Move for secure task management
- **Package ID**: `0xaedc9939fe4edc45350d9f9ab657c2ef0fb3966d09ece11271e4a07455a3467f` (Testnet)

### **Encryption & Storage**

- **Seal**: Identity-Based Encryption (IBE) using BLS12-381 cryptography
- **Walrus**: Decentralized object storage with multi-aggregator redundancy
- **Key Servers**: Distributed key management across multiple testnet servers
- **Session Management**: 30-minute TTL session keys for secure access

### **Frontend & User Interface**

- **React 18**: Modern UI framework with TypeScript support
- **Vite**: Fast build tooling and development server
- **Radix UI**: Pre-built accessible UI components
- **@mysten/dapp-kit**: Official Sui wallet integration and data loading
- **@mysten/seal**: Official Seal SDK for encryption/decryption operations

### **Development & Deployment**

- **TypeScript**: Type-safe development with full IDE support
- **ESLint**: Code quality and consistency enforcement
- **pnpm**: Fast, efficient package management
- **Sui CLI**: Contract deployment and blockchain interaction tools

## 🗺️ Development Roadmap

### ✅ **Current Status (MVP Completed)**

- ✅ Core smart contract deployment on Sui Testnet
- ✅ Task CRUD operations with encrypted content storage
- ✅ Walrus integration with multi-aggregator support
- ✅ Seal encryption/decryption with proper key management
- ✅ User authentication via Sui wallet integration
- ✅ File upload/download with automatic type detection

### 🚧 **Next Phase (v1.0)**

- **Enhanced UI/UX**: Improved task filtering, searching, and sorting
- **Batch Operations**: Multiple task management and bulk actions
- **Notification System**: Task deadline alerts and sharing notifications
- **Advanced Permissions**: Role-based access control and team management
- **Performance Optimization**: Caching and lazy loading for better performance

### 🔮 **Future Enhancements (v1.5+)**

- **API & SDK Release**: Third-party integration capabilities
- **Cross-Chain Support**: Multi-blockchain task synchronization
- **Analytics Dashboard**: Task completion metrics and productivity insights
- **Mobile Apps**: Native iOS and Android applications
- **Enterprise Features**: SSO integration and advanced audit trails

## 📖 Usage Guide

### 🆕 **Creating Tasks**

1. Connect your Sui wallet to the application
2. Navigate to the "Create Task" tab
3. Enter task title and description
4. Set priority level (Low, Medium, High, Critical)
5. Set due date (optional)
6. Click "Create Task" and confirm the transaction

### 📎 **Adding Content and Files**

1. Select a task from your "My Tasks" list
2. Go to the "Add Content & Files" tab
3. Enter content in the text area and/or select files to upload
4. Choose a Walrus service from the dropdown
5. Click "Encrypt & Upload to Walrus"
6. Wait for encryption and upload to complete
7. Files are automatically encrypted using Seal before storage

### 🤝 **Sharing Tasks**

1. Select a task you've created
2. Navigate to the "Share Task" tab
3. Enter wallet addresses of users you want to share with (comma-separated)
4. Click "Share Task" and confirm the transaction
5. Shared users will be able to view and decrypt the task content

### 👀 **Viewing Shared Tasks**

1. Navigate to a task you have access to (either created by you or shared with you)
2. Click "View Content & Download Files"
3. Sign the personal message in your wallet to create a session key (30-minute validity)
4. Wait for key server connectivity check and decryption process
5. View decrypted content and download files
6. Images are automatically detected and can be viewed inline

### 🔧 **Troubleshooting**

**"Key servers are not accessible"**
- Wait a few minutes and try again (testnet servers may be temporarily unavailable)
- Check your internet connection
- Try refreshing the page

**"No access to decryption keys"**
- Ensure the task is shared with your wallet address
- Verify you're using the correct wallet account
- Check that you're the task creator or have been granted access

## 🛠️ Tech Stack

- **[React](https://react.dev/)** - UI framework with TypeScript support
- **[TypeScript](https://www.typescriptlang.org/)** - Type checking and development safety
- **[Vite](https://vitejs.dev/)** - Fast build tooling and development server
- **[Radix UI](https://www.radix-ui.com/)** - Accessible pre-built UI components
- **[ESLint](https://eslint.org/)** - Code linting and quality enforcement
- **[@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit)** - Sui wallet integration and data loading
- **[@mysten/seal](https://www.npmjs.com/package/@mysten/seal)** - Official Seal SDK for encryption
- **[pnpm](https://pnpm.io/)** - Fast, efficient package management
- **Walrus** - Decentralized storage with multi-aggregator redundancy

## Development Setup

### Install Sui CLI

Before deploying your move code, ensure that you have installed the Sui CLI. You
can follow the [Sui installation instruction](https://docs.sui.io/build/install)
to get everything set up.

This application uses `testnet` by default, so we'll need to set up a testnet
environment in the CLI:

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

If you haven't set up an address in the sui client yet, you can use the
following command to get a new address:

```bash
sui client new-address secp256k1
```

This will generate a new address and recovery phrase for you. You can mark a
newly created address as your active address by running the following command
with your new address:

```bash
sui client switch --address 0xYOUR_ADDRESS...
```

We can ensure we have some Sui in our new wallet by requesting Sui from the
faucet `https://faucet.sui.io`.

### Publishing the Move Package

The Move code for this application is located in the `move/task_manager` directory. To publish
it, you can enter the directory and publish it with the Sui CLI:

```bash
cd move/task_manager
sui client publish --gas-budget 100000000
```

In the output there will be an object with a `"packageId"` property. You'll want
to save that package ID to the `src/constants.ts` file:

```ts
export const TESTNET_TASK_MANAGER_PACKAGE_ID = "<YOUR_PACKAGE_ID>";
```

Now that we have published the Move code and updated the package ID, we can
start the app.

## Getting Started

To install dependencies you can run

```bash
pnpm install
```

To start your dApp in development mode run

```bash
pnpm dev
```

## Building

To build your app for deployment you can run

```bash
pnpm build
```

## 📊 Success Metrics & Current Status

### **Technical Achievements**

- ✅ **Zero Critical Vulnerabilities**: Secure implementation following official SEAL patterns
- ✅ **Wallet Integration**: Seamless Sui wallet connectivity and authentication
- ✅ **Encryption Performance**: Sub-2s file encryption/decryption for typical file sizes
- ✅ **Storage Reliability**: Multi-aggregator Walrus integration with automatic failover

### **User Experience**

- ✅ **Intuitive Interface**: Clean, responsive UI with clear user flows
- ✅ **Error Handling**: Comprehensive error messages and recovery guidance
- ✅ **Accessibility**: WCAG-compliant design with keyboard navigation support
- ✅ **Performance**: Fast task operations with optimized blockchain interactions

## 🔐 Security & Privacy

### **Encryption Standards**

- **Identity-Based Encryption (IBE)**: Using BLS12-381 elliptic curve cryptography
- **Client-Side Encryption**: All content encrypted before leaving the user's device
- **Distributed Key Management**: Multi-server key distribution for enhanced security
- **Threshold Encryption**: 2-out-of-N server configuration with automatic fallback

### **Access Control**

- **Smart Contract Verification**: On-chain access control via `seal_approve` function
- **Wallet-Based Authentication**: Cryptographic proof of identity via wallet signatures
- **Granular Permissions**: Task-level access control with user-specific sharing
- **Session Management**: Time-limited session keys (30-minute TTL) for secure operations

## 🚀 Getting Started

Ready to try azKPI? Follow the development setup guide below to get the application running locally, or visit our live demo to experience decentralized task management with end-to-end encryption.

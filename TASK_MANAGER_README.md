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

### Seal Encryption/Decryption Implementation

#### SealClient Setup
```typescript
import { SealClient, getAllowlistedKeyServers } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const client = new SealClient({
  suiClient,
  serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false, // Set to true for production verification
});
```

#### SessionKey Management
```typescript
import { SessionKey } from '@mysten/seal';

// Create SessionKey for package-specific access
const sessionKey = await SessionKey.create({
  address: userAddress,
  packageId: fromHEX(packageId),
  ttlMin: 10, // 10 minutes TTL
  suiClient,
});

// User signs personal message in wallet
const message = sessionKey.getPersonalMessage();
const { signature } = await signPersonalMessage(message);
sessionKey.setPersonalMessageSignature(signature);
```

### Encryption Flow

#### 1. File/Content Encryption
```typescript
import { fromHex, toHex } from '@mysten/sui/utils';

const encryptData = async (data: Uint8Array, taskId: string) => {
  // Generate unique encryption ID
  const nonce = crypto.getRandomValues(new Uint8Array(5));
  const taskIdBytes = fromHex(taskId);
  const encryptionId = toHex(new Uint8Array([...taskIdBytes, ...nonce]));
  
  // Encrypt with threshold encryption (2 out of N key servers)
  const { encryptedObject: encryptedBytes, key: backupKey } = await client.encrypt({
    threshold: 2,
    packageId: fromHex(packageId),
    id: encryptionId,
    data,
  });
  
  return { encryptedBytes, encryptionId, backupKey };
};

// Example: Encrypt file for upload
const handleFileEncryption = async (file: File, taskId: string) => {
  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);
  
  return await encryptData(fileData, taskId);
};
```

#### 2. Walrus Storage Upload
```typescript
const uploadToWalrus = async (encryptedBytes: Uint8Array) => {
  const publisherUrl = getPublisherUrl('/v1/blobs?epochs=1');
  
  const response = await fetch(publisherUrl, {
    method: 'PUT',
    body: encryptedBytes,
  });
  
  if (response.ok) {
    const storageInfo = await response.json();
    return storageInfo.info.newlyCreated.blobObject.blobId;
  }
  
  throw new Error('Failed to upload to Walrus');
};
```

### Decryption Flow

#### 1. Batch Key Fetching with Access Control
```typescript
import { Transaction } from '@mysten/sui/transactions';
import { EncryptedObject, NoAccessError } from '@mysten/seal';

const downloadAndDecrypt = async (
  blobIds: string[],
  sessionKey: SessionKey,
  suiClient: SuiClient,
  sealClient: SealClient,
  moveCallConstructor: (tx: Transaction, id: string) => void,
) => {
  // Download encrypted files from Walrus aggregators
  const aggregators = ['aggregator1', 'aggregator2', 'aggregator3'];
  const validDownloads: ArrayBuffer[] = [];
  
  for (const blobId of blobIds) {
    for (const aggregator of aggregators) {
      try {
        const response = await fetch(`${aggregator}/v1/blobs/${blobId}`);
        if (response.ok) {
          validDownloads.push(await response.arrayBuffer());
          break;
        }
      } catch (err) {
        console.log(`Failed to download from ${aggregator}:`, err);
      }
    }
  }

  if (validDownloads.length === 0) {
    throw new Error('Cannot retrieve files from Walrus aggregators');
  }

  // Fetch keys in batches of ≤10 for rate limiting
  for (let i = 0; i < validDownloads.length; i += 10) {
    const batch = validDownloads.slice(i, i + 10);
    const ids = batch.map(enc => EncryptedObject.parse(new Uint8Array(enc)).id);
    
    const tx = new Transaction();
    ids.forEach(id => moveCallConstructor(tx, id));
    const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
    
    try {
      await sealClient.fetchKeys({ 
        ids, 
        txBytes, 
        sessionKey, 
        threshold: 2 
      });
    } catch (err) {
      if (err instanceof NoAccessError) {
        throw new Error('No access to decryption keys');
      }
      throw new Error('Unable to fetch decryption keys');
    }
  }

  // Decrypt files sequentially
  const decryptedFileUrls: string[] = [];
  for (const encryptedData of validDownloads) {
    const fullId = EncryptedObject.parse(new Uint8Array(encryptedData)).id;
    const tx = new Transaction();
    moveCallConstructor(tx, fullId);
    const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
    
    try {
      // Keys are already fetched, this only does local decryption
      const decryptedFile = await sealClient.decrypt({
        data: new Uint8Array(encryptedData),
        sessionKey,
        txBytes,
      });
      
      const blob = new Blob([decryptedFile], { type: 'image/jpg' });
      decryptedFileUrls.push(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Decryption failed:', err);
      throw new Error('Unable to decrypt file');
    }
  }
  
  return decryptedFileUrls;
};
```

#### 2. Move Call Constructor for Access Control
```typescript
const constructMoveCall = (packageId: string, taskId: string) => {
  return (tx: Transaction, encryptionId: string) => {
    tx.moveCall({
      target: `${packageId}::task_manager::seal_approve`,
      arguments: [
        tx.pure.vector("u8", Array.from(fromHex(encryptionId))),
        tx.pure.address(userAddress),
        tx.object(taskId), // Task object for access verification
      ]
    });
  };
};
```

### Complete Integration Examples

#### Upload Task with Encrypted Files
```typescript
const uploadTaskFiles = async (files: File[], taskId: string) => {
  const uploadPromises = files.map(async (file) => {
    // 1. Encrypt file
    const { encryptedBytes, encryptionId } = await handleFileEncryption(file, taskId);
    
    // 2. Upload to Walrus
    const blobId = await uploadToWalrus(encryptedBytes);
    
    return { blobId, encryptionId };
  });
  
  const results = await Promise.all(uploadPromises);
  
  // 3. Store metadata on-chain
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::task_manager::add_files`,
    arguments: [
      tx.object(taskId),
      tx.pure.vector("string", results.map(r => r.blobId)),
      tx.pure.vector("vector<u8>", results.map(r => Array.from(fromHex(r.encryptionId)))),
    ]
  });
  
  return await signAndExecuteTransaction(tx);
};
```

#### Download and Decrypt Task Files
```typescript
const downloadTaskFiles = async (taskId: string, userAddress: string) => {
  // 1. Get task metadata from blockchain
  const task = await suiClient.getObject({
    id: taskId,
    options: { showContent: true }
  });
  
  const blobIds = task.data?.content?.fields?.file_blob_ids || [];
  
  if (blobIds.length === 0) {
    return [];
  }
  
  // 2. Create or reuse session key
  let currentSessionKey = getStoredSessionKey();
  if (!currentSessionKey || currentSessionKey.isExpired()) {
    currentSessionKey = await createNewSessionKey(userAddress, packageId);
  }
  
  // 3. Setup move call constructor for access control
  const moveCallConstructor = constructMoveCall(packageId, taskId);
  
  // 4. Download and decrypt files
  try {
    const decryptedUrls = await downloadAndDecrypt(
      blobIds,
      currentSessionKey,
      suiClient,
      client,
      moveCallConstructor
    );
    
    return decryptedUrls;
  } catch (err) {
    console.error('Failed to decrypt files:', err);
    throw err;
  }
};
```

### Error Handling Best Practices
```typescript
// Comprehensive error handling
try {
  await downloadAndDecrypt(blobIds, sessionKey, suiClient, sealClient, moveCallConstructor);
} catch (err) {
  if (err instanceof NoAccessError) {
    setError('No access to decryption keys - check task permissions');
  } else if (err.message.includes('Cannot retrieve files')) {
    setError('Files unavailable from Walrus aggregators, try again later');
  } else if (err.message.includes('fetchKeys')) {
    setError('Failed to fetch decryption keys from key servers');
  } else {
    setError('Unable to decrypt files, please try again');
  }
  console.error('Decryption error details:', err);
}
```

### Performance Optimizations
- **Key Caching**: SealClient automatically caches keys for subsequent decryptions
- **Batch Processing**: Fetch up to 10 keys per request to respect rate limits  
- **Session Reuse**: SessionKey valid for TTL duration, no need to re-sign
- **Aggregator Failover**: Automatic retry with different Walrus aggregators
- **Parallel Downloads**: Download multiple files concurrently when possible

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

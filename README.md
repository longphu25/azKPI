# azKPI — Decentralized Task Management Platform

## Overview

azKPI is a decentralized task management solution powered by the Sui blockchain, designed for individuals and organizations seeking transparency, security, and privacy in managing their workflows. The system integrates Walrus for decentralized file/content storage and Seal for robust content encryption, ensuring both on-chain data integrity and off-chain privacy.

## Purpose and Goals

- **Decentralized Workflow**: Empower users to manage tasks collaboratively without a single point of control or failure
- **Secure Storage & Privacy**: Use Walrus and Seal technologies to ensure sensitive content/files are encrypted and securely stored off-chain, reducing blockchain bloat and minimizing risks
- **Immutable Audit Trails**: Leverage Sui blockchain to record task creation, update, completion, and assignment events for tamper-proof auditability
- **Seamless User Experience**: Provide intuitive interfaces for individuals and teams to create, assign, monitor, and complete tasks
- **Integration Readiness**: Enable API-level integrations with third-party systems and dApps through open standards

## Key Features

### Task Management Core

- **Task Creation**: Users can create tasks with title, description, deadline, priority, and attachments
- **Assignment**: Tasks can be assigned to individuals or groups, supporting both open and permissioned assignment logic
- **Status Tracking**: Each task maintains a clear status: To Do, In Progress, Review, Completed, Archived
- **Comments & Collaboration**: Users can comment or add notes on tasks

### Sui Blockchain Integration

- **Immutable Records**: Every task event (creation, assignment, status change, completion) is recorded as a transaction on Sui
- **Access Control**: Ownership and edit rights are managed through on-chain identities (address, multi-sig)
- **Smart Contracts**: Implement programmable workflows (e.g., auto-archival, expiring assignments)

### Walrus & Seal Integration

- **Secure File Storage**: All attachments and sensitive content are uploaded to Walrus, utilizing Seal for client-side encryption
- **Access Keys**: Encrypted content is only accessible to authorized participants via distributed keys
- **Redundancy**: Walrus ensures high availability and resilience of data, with the content addressable via unique CIDs (Content Identifiers)
- **Data Privacy**: Files never leave secure, end-to-end encrypted storage unless decrypted by intended users

### User Interface/Experience

- **Web App & Mobile Friendly**: Responsive UI for task browsing, searching, filtering, and notification management
- **File Interaction**: Users can securely upload, download, preview, and decrypt files within the app
- **Wallet Connectivity**: Native support for Sui wallets to authenticate and sign task actions

### Security & Compliance

- **End-to-End Encryption**: All data-at-rest and data-in-transit are encrypted using Seal, following best practices and post-quantum readiness measures if available
- **Permission Models**: Flexible task and file permission settings (public, private, group-based)
- **Audit & Transparency**: Activity logs are both human- and machine-readable, directly verifiable via blockchain explorers

## Non-Functional Requirements

- **Performance**: Transaction finality and file access latency must ensure seamless use (<2s perceived delay for key operations)
- **Scalability**: Capable of supporting thousands of users and millions of tasks with minimal degradation
- **Reliability**: 99.95% service uptime target for critical operations
- **Usability**: UX tested for accessibility (WCAG 2.1 compliance), intuitive navigation, and low onboarding friction

## Technical Stack

- **Smart Contracts**: Sui Move language, open-source for auditability
- **Storage**: Walrus (decentralized object storage); Seal (encryption toolkit)
- **Frontend**: ReactJS, TypeScript, SuiJS SDK integration
- **Backend/API**: NodeJS, REST/Web3 endpoints, event bus for integrations
- **Wallets**: Sui wallet SDKs (browser, mobile)

## Roadmap

### MVP (3 months)

- Core smart contract deployment
- Basic task CRUD with Walrus integration
- User authentication with Sui wallet

### v1.0 (3-6 months)

- Enhanced permissions
- End-to-end encrypted file sharing
- Smart contract based audit logs

### v1.5+

- API & plugin release
- Best-of-breed analytics dashboard
- Cross-chain integration explorations

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

## Tech Stack

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Radix UI](https://www.radix-ui.com/) for pre-built UI components
- [ESLint](https://eslint.org/) for linting
- [`@mysten/dapp-kit`](https://sdk.mystenlabs.com/dapp-kit) for connecting to wallets and loading data
- [pnpm](https://pnpm.io/) for package management
- **Walrus** for decentralized storage

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

## Success Metrics

- **Adoption**: Number of active users, teams, and organizations onboarded
- **Task Lifecycle**: % of tasks completed via mobile/desktop, average time to completion
- **Data Security**: 0 critical vulnerabilities reported; independent audit completion
- **User Satisfaction**: CSAT > 80% on standardized survey post-launch

## Risks & Mitigations

- **On-Chain Cost Volatility**: Monitor Sui gas economics; consider partial off-chain operations
- **User Onboarding Complexity**: Provide clear documentation and simplified wallet flows
- **Data Loss/Leakage**: Regular security reviews; leverage community bug bounty

---

This PRD establishes a blueprint for developing azKPI as a pioneering decentralized, secure, and user-centric task management platform, leveraging the strengths of the Sui blockchain, Walrus storage, and Seal encryption.

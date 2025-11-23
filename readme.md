# ETH Global Hackathon - Launch Pools Platform

A full-stack decentralized crowdfunding platform with integrated prize draws, built for ETH Global hackathon. Launch Pools combine project funding with fair draws, integrating **Hardhat 3**, **Coinbase Developer Platform (CDP)**, and **Pyth Network Entropy** for secure, verifiable on-chain randomness.

## Project Overview

This project enables users to create and participate in **Launch Pools** - a revolutionary crowdfunding mechanism that combines project funding with fair prize draws. Launch Pools represent a new paradigm where:

- **Project creators** launch funding campaigns to raise capital for their initiatives
- **Backers** contribute funds to support projects, automatically earning participation shares (1 wei = 1 share) in the pool
- **Winners** are selected using **Pyth Entropy** for provably fair randomness among all contributors
- **Funds** are automatically distributed between the project, platform, and lucky backer using secure pull-payment patterns

### The Launch Pool Concept

**Launch Pools** merge the best of crowdfunding and prize draws into a single, gamified funding experience:

1. **Crowdfunding Phase**: Project creators set up a funding pool with a target amount and duration. Backers contribute ETH to support the project, with each contribution automatically granting them proportional shares in the pool.

2. **Participation Shares**: Unlike traditional raffles where tickets are purchased separately, in Launch Pools, every contribution directly supports the project while simultaneously entering the contributor into the prize draw. The more you contribute, the more shares you receive, increasing your chances of winning.

3. **Fair Draw**: Once the funding period ends, a verifiable random draw (powered by Pyth Entropy) selects a winner from all contributors. The winner receives a portion of the pooled funds, while the project receives its funding allocation.

4. **Win-Win Model**: This model incentivizes larger contributions (more shares = better odds) while ensuring projects get funded, creating a sustainable ecosystem where backers are rewarded for their support.

The platform consists of two main components:
- **`web3/`** - Smart contracts, deployment scripts, and blockchain interaction layer
- **`web2/`** - Frontend application with Coinbase CDP wallet integration

---

## Architecture

### Smart Contracts (`web3/contracts/`)

- **`RaffleFactory.sol`** - Factory contract that creates and manages multiple Launch Pool instances
- **`ProjectRaffle.sol`** - Individual Launch Pool contract with contribution tracking, entropy-based winner selection, and fund distribution
- **`interfaces/IEntropyV2.sol`** & **`IEntropyConsumer.sol`** - Minimal interfaces for Pyth Entropy integration (vendored locally since the npm package doesn't include Solidity source files)

### Frontend (`web2/`)

- React-based UI built with TanStack Start
- Coinbase CDP embedded wallet integration for seamless user authentication
- Components for wallet management, Launch Pool creation, and backer participation

---

## Libraries and Their Usage

### 1. Hardhat 3 (`web3/`)

**Purpose**: Development environment for compiling, deploying, testing, and debugging Ethereum smart contracts.

**Usage in this project**:

#### Configuration (`hardhat.config.ts`)
- **Solidity Compiler**: Configured to use Solidity 0.8.28 with optimizer enabled (200 runs) and IR-based compilation
- **Network Configuration**: 
  - Base Sepolia testnet (chain ID 84532) for deployment
  - Local Hardhat network (chain ID 1337) for development and testing
- **Plugins**:
  - `@nomicfoundation/hardhat-ignition` - For deployment management
  - `@nomicfoundation/hardhat-ethers` - Ethers.js integration
  - `@nomicfoundation/hardhat-verify` - Contract verification on block explorers

#### Deployment (`ignition/modules/RaffleFactoryModule.ts`)
- Uses **Hardhat Ignition** to deploy the `RaffleFactory` contract
- Automatically configures Pyth Entropy address for Base Sepolia
- Manages deployment state and allows resuming interrupted deployments

#### Scripts (`web3/scripts/`)
- **`checkBalance.ts`** - Check deployer wallet balance on Base Sepolia
- **`showRaffle.ts`** - Display Launch Pool contract state and metadata
- **`buyTickets.ts`** - Contribute to a Launch Pool (earns participation shares)

#### Testing (`web3/test/`)
- **`raffleFlow.test.ts`** - End-to-end integration tests covering:
  - Factory deployment
  - Launch Pool creation
  - Backer contributions
  - Entropy request and winner selection

#### Frontend Helpers (`web3/frontend/`)
- **`factoryClient.ts`** - TypeScript utilities for interacting with `RaffleFactory` from frontend
- **`raffleClient.ts`** - TypeScript utilities for interacting with `ProjectRaffle` contracts

**Key Hardhat Commands**:
```bash
npm run compile          # Compile Solidity contracts
npm run test            # Run test suite
npm run deploy:baseSepolia  # Deploy to Base Sepolia
```

---

### 2. Coinbase Developer Platform (CDP) (`web2/`)

**Purpose**: Provides embedded wallet infrastructure, authentication, and blockchain interaction tools for end-users.

**Usage in this project**:

#### Configuration (`web2/src/config/cdp.ts`)
- **Project ID**: Configured via `VITE_CDP_PROJECT_ID` environment variable
- **Account Types**: Supports both EOA (Externally Owned Accounts) and Smart Accounts
- **Authentication Methods**: Email, SMS, OAuth (Google, Apple)
- **Network**: Configured for Base Sepolia testnet

#### Wallet Components (`web2/src/components/wallet/`)
- **`WalletApp.tsx`** - Main wallet application wrapper with `CDPReactProvider`
- **`SignInScreen.tsx`** - Authentication interface for user login
- **`SignedInScreen.tsx`** - Main wallet interface showing balance and transaction capabilities
- **`UserBalance.tsx`** - Displays user's ETH balance on Base Sepolia
- **`EOATransaction.tsx`** - Handles transaction creation and execution
- **`WalletHeader.tsx`** - Header component with wallet address and auth controls

#### Integration (`web2/src/routes/wallet.tsx`)
- Dedicated `/wallet` route for wallet functionality
- Client-side only rendering to avoid SSR compatibility issues with CDP SDK
- Isolated from other TanStack Start demo routes

#### Dependencies
- `@coinbase/cdp-core` - Core CDP functionality
- `@coinbase/cdp-hooks` - React hooks for CDP wallet operations
- `@coinbase/cdp-react` - React components and providers
- `viem` - Ethereum library for blockchain interactions (used alongside CDP)

**How it works**:
1. Users navigate to `/wallet` route
2. CDP handles authentication (email/SMS/OAuth)
3. Embedded wallet is created automatically on first login
4. Users can view balance, send transactions, and interact with smart contracts
5. Wallet address can be used to contribute to Launch Pools and participate in draws

**Setup**:
```bash
cd web2
pnpm install
# Create .env file with VITE_CDP_PROJECT_ID
pnpm dev
```

See `web2/CDP_INTEGRATION.md` for detailed integration guide.

---

### 3. Pyth Network (`web3/`)

**Purpose**: Provides verifiable, on-chain randomness for fair winner selection in Launch Pool draws.

**Usage in this project**:

#### Smart Contract Integration (`web3/contracts/ProjectRaffle.sol`)

**Pyth Entropy Contract Address** (Base Sepolia):
- `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`

**How it works**:

1. **Entropy Request** (`requestEntropy` function):
   ```solidity
   entropySequenceNumber = entropy.request{value: fee}(
       entropyProvider,
       userRandomNumber,  // User-provided commitment
       true              // Use blockhash
   );
   ```
   - Owner/admin calls this after raffle ends
   - Pays required fee to Pyth Entropy contract
   - Receives a sequence number for tracking

2. **Entropy Callback** (`entropyCallback` function):
   ```solidity
   function entropyCallback(
       uint64 sequenceNumber,
       address provider,
       bytes32 randomNumber
   ) external override
   ```
   - Automatically called by Pyth Entropy contract when randomness is ready
   - Uses the random number to select winner via binary search (O(log n))
   - Updates raffle state to `DrawExecuted`

3. **Winner Selection** (`_selectWinner` function):
   - Uses Pyth's random number to select a ticket
   - Implements binary search on ticket ranges for efficiency
   - Returns the address of the winning participant

#### Interface Implementation
- **`IEntropyConsumer`**: Contract must implement this to receive entropy callbacks
- **`IEntropyV2`**: Interface for interacting with Pyth Entropy V2 contract
- Both interfaces are vendored locally in `web3/contracts/interfaces/` since the npm package doesn't include Solidity source files

#### Dependencies
- `@pythnetwork/entropy-sdk-solidity` (v2.2.0) - Referenced for interface definitions, but interfaces are implemented locally

**Why Pyth Entropy?**
- **Verifiable**: Randomness is cryptographically verifiable on-chain
- **Permissionless**: Anyone can request randomness without whitelisting
- **Secure**: Combines user commitment, provider randomness, and blockhash
- **Fair**: No single party can manipulate the outcome

**Integration Flow**:
1. Launch Pool creator calls `requestEntropy(bytes32 userRandomNumber)` with a commitment after the funding period ends
2. Pyth Entropy contract processes the request and generates randomness
3. Pyth calls `entropyCallback` on the Launch Pool contract with the random number
4. Launch Pool contract selects winner from all backers using the random number
5. Funds are then distributed to project, platform, and winning backer

---

## Project Structure

```
eth-global-hackathon/
├── web3/                          # Smart contract layer
│   ├── contracts/                 # Solidity contracts
│   │   ├── ProjectRaffle.sol      # Main Launch Pool contract
│   │   ├── RaffleFactory.sol      # Factory contract for Launch Pools
│   │   └── interfaces/            # Pyth Entropy interfaces
│   ├── scripts/                   # Deployment and utility scripts
│   ├── test/                      # Hardhat tests
│   ├── frontend/                  # TypeScript client libraries
│   ├── ignition/                  # Hardhat Ignition deployments
│   └── hardhat.config.ts          # Hardhat configuration
│
└── web2/                          # Frontend application
    ├── src/
    │   ├── components/
    │   │   └── wallet/           # CDP wallet components
    │   ├── config/
    │   │   └── cdp.ts            # CDP configuration
    │   └── routes/
    │       └── wallet.tsx        # Wallet route
    └── CDP_INTEGRATION.md         # CDP integration guide
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (for web2) or npm (for web3)
- Base Sepolia testnet ETH (for deployment and testing)

### Smart Contract Development

```bash
cd web3
npm install
npm run compile
npm run test
npm run deploy:baseSepolia
```

### Frontend Development

```bash
cd web2
pnpm install
# Create .env with VITE_CDP_PROJECT_ID
pnpm dev
```

---

## Deployed Contracts (Base Sepolia)

- **RaffleFactory**: `0x104032d5377be9b78441551e169f3C8a3d520672`
- **Pyth Entropy**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`

---

## Key Features

✅ **Launch Pool Model**: Innovative crowdfunding mechanism combining project funding with prize draws  
✅ **Secure Randomness**: Pyth Entropy ensures provably fair winner selection among all backers  
✅ **Gas Efficient**: Binary search for O(log n) winner selection  
✅ **Secure Payments**: PullPayment pattern prevents reentrancy attacks  
✅ **User-Friendly**: Coinbase CDP embedded wallets for seamless UX  
✅ **Factory Pattern**: Create unlimited Launch Pools from a single factory  
✅ **Flexible Distribution**: Configurable fund split between project, platform, and winning backer  
✅ **Proportional Participation**: Each contribution automatically grants proportional shares in the draw  

---

## License

MIT


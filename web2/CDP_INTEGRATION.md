# CDP Wallet Integration Guide

## Overview

The Coinbase CDP (Coinbase Developer Platform) embedded wallet SDK has been successfully integrated into this TanStack Start project as a new `/wallet` route. This integration keeps all existing TanStack demo routes intact while adding Web3 wallet functionality.

## What Was Added

### 1. Dependencies

The following packages were added to `package.json`:
- `@coinbase/cdp-core` - Core CDP functionality
- `@coinbase/cdp-hooks` - React hooks for CDP
- `@coinbase/cdp-react` - React components for CDP
- `viem` - Ethereum library for blockchain interactions
- `buffer` - Polyfill for viem compatibility

### 2. Configuration Files

- **`src/config/cdp.ts`** - CDP configuration including project ID, account types, and auth methods
- **`src/config/theme.ts`** - Theme configuration for CDP components

### 3. Wallet Components

All wallet components are organized in `src/components/wallet/`:
- **`Icons.tsx`** - SVG icon components (User, Copy, Check)
- **`Loading.tsx`** - Loading spinner component
- **`SignInScreen.tsx`** - Authentication screen
- **`SignedInScreen.tsx`** - Main wallet interface with balance and transactions
- **`UserBalance.tsx`** - Displays user's ETH balance
- **`WalletHeader.tsx`** - Header with wallet address and auth button
- **`EOATransaction.tsx`** - Transaction handling component

### 4. Wallet Route

- **`src/routes/wallet.tsx`** - New route at `/wallet` with client-side only loading
- **`src/components/wallet/WalletApp.tsx`** - Main wallet app wrapper with `CDPReactProvider`

### 5. Styles

CDP-specific styles have been merged into `src/styles.css`, including:
- CSS custom properties for theming
- Component-specific styles
- Responsive design breakpoints
- Dark mode support

### 6. Assets

- **`public/eth.svg`** - Ethereum icon for balance display

### 7. Vite Configuration

Updated `vite.config.ts` to include:
- SSR external configuration for CDP packages
- Global definitions for Node.js compatibility

### 8. TypeScript Configuration

Updated `tsconfig.json` to include:
- Package JSON exports/imports resolution for CDP SDK compatibility

## How to Use

### 1. Install Dependencies

```bash
cd web2
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `web2` directory (you can use the example from `cdp-app-react`):

```env
# CDP Configuration
VITE_CDP_PROJECT_ID=your-project-id-here

# Ethereum Account type: "eoa" for regular accounts, "smart" for Smart Accounts
VITE_CDP_CREATE_ETHEREUM_ACCOUNT_TYPE=eoa

# Whether to create a Solana Account
VITE_CDP_CREATE_SOLANA_ACCOUNT=false
```

**To get your CDP Project ID:**
1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project or use an existing one
3. Copy your Project ID

### 3. Run the Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 4. Access the Wallet

Navigate to `http://localhost:3000/wallet` to access the CDP wallet interface.

## Features

### Authentication
- Email authentication
- SMS authentication  
- OAuth (Google, Apple)

### Wallet Functionality
- View ETH balance on Base Sepolia testnet
- Send test transactions
- Copy wallet address to clipboard
- Real-time balance updates

### Getting Test ETH
To test transactions, you'll need testnet ETH:
1. Sign in to the wallet
2. Copy your wallet address
3. Visit the [Base Sepolia Faucet](https://portal.cdp.coinbase.com/products/faucet)
4. Request test ETH

## Project Structure

```
web2/
├── src/
│   ├── components/
│   │   └── wallet/           # All wallet-related components
│   │       ├── WalletApp.tsx # Main wallet app (client-side only)
│   │       ├── Loading.tsx
│   │       ├── SignInScreen.tsx
│   │       ├── SignedInScreen.tsx
│   │       ├── UserBalance.tsx
│   │       ├── WalletHeader.tsx
│   │       ├── EOATransaction.tsx
│   │       └── Icons.tsx
│   ├── config/
│   │   ├── cdp.ts           # CDP configuration
│   │   └── theme.ts         # CDP theme
│   ├── routes/
│   │   └── wallet.tsx       # Wallet route (lazy loads client-side)
│   └── styles.css           # Includes CDP styles
├── public/
│   └── eth.svg              # Ethereum icon
├── vite.config.ts           # Updated for SSR compatibility
└── tsconfig.json            # Updated for CDP SDK
```

## Key Differences from Original CDP App

1. **Isolated Route**: The wallet functionality is isolated in the `/wallet` route instead of being the main app
2. **Self-Contained**: All wallet components are in a separate `wallet` folder
3. **No Modifications**: The existing TanStack demo routes and components remain untouched
4. **Provider Scoped**: The `CDPReactProvider` only wraps the wallet route, not the entire app
5. **Client-Side Only**: The wallet components are loaded client-side only to avoid SSR compatibility issues with the CDP SDK

## Next Steps

### Customization
- Update the app name and logo URL in `src/config/cdp.ts`
- Customize the theme in `src/config/theme.ts`
- Modify wallet components in `src/components/wallet/` as needed

### Adding to Navigation (Optional)
If you want to add a link to the wallet in the main navigation, you can update `src/components/Header.tsx` to include a link to `/wallet`.

### Production Deployment
Before deploying to production:
1. Set up proper environment variables
2. Update the `appLogoUrl` in CDP config to your production URL
3. Configure proper authentication methods
4. Test thoroughly on testnet before using mainnet

## Troubleshooting

### Module Not Found Errors
If you see module resolution errors, make sure all dependencies are installed:
```bash
pnpm install
```

### "require is not defined" Error
This error occurs when the CDP SDK tries to load in an SSR context. The wallet route is configured to load client-side only, which should prevent this. If you still see this error:
1. Make sure you're accessing `/wallet` route (not trying to use CDP components elsewhere)
2. Clear your build cache: `rm -rf .tanstack node_modules/.vite`
3. Restart the dev server

### TypeScript Compilation Errors
If you see TypeScript errors related to CDP SDK imports, ensure your `tsconfig.json` has:
```json
"resolvePackageJsonExports": true,
"resolvePackageJsonImports": true
```

### CDP Project ID Not Set
Make sure your `.env` file exists and contains a valid `VITE_CDP_PROJECT_ID`.

## Resources

- [CDP Documentation](https://docs.cdp.coinbase.com/)
- [CDP React SDK](https://github.com/coinbase/cdp-sdk-react)
- [TanStack Start Documentation](https://tanstack.com/start)
- [Base Sepolia Faucet](https://portal.cdp.coinbase.com/products/faucet)


import { CDPReactProvider } from "@coinbase/cdp-react";
import { useCurrentUser, useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { Link } from '@tanstack/react-router';

import { CDP_CONFIG } from '../../config/cdp'
import { theme } from '../../config/theme'
import WalletHeader from './WalletHeader'
import { IconUser, IconCopy, IconCheck } from './Icons'

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function ProfileContent() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const [balance, setBalance] = useState<bigint | undefined>(undefined);
  const [isCopied, setIsCopied] = useState<string | null>(null);

  const formattedBalance = useMemo(() => {
    if (balance === undefined) return undefined;
    return formatEther(balance);
  }, [balance]);

  const getBalance = useCallback(async () => {
    if (!evmAddress) return;
    const weiBalance = await client.getBalance({
      address: evmAddress,
    });
    setBalance(weiBalance);
  }, [evmAddress]);

  useEffect(() => {
    getBalance();
  }, [getBalance]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isSignedIn || !currentUser) {
    return (
      <>
        <WalletHeader />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <IconUser className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Please Sign In</h2>
          <p className="text-muted-foreground">You need to sign in to view your profile</p>
          <Link 
            to="/wallet" 
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Wallet
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <WalletHeader />
      <main className="py-16 px-4 w-full flex flex-col items-center justify-center flex-grow">
        <div className="w-full max-w-3xl space-y-6">
          {/* Profile Header */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IconUser className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Your Profile</h1>
                <p className="text-muted-foreground">Wallet and account information</p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-4">
              {/* User ID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm break-all">{currentUser.userId}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(currentUser.userId, 'userId')}
                  className="self-start sm:self-center px-3 py-1 text-sm bg-background border border-border rounded hover:bg-muted transition-colors flex items-center gap-2"
                  aria-label="Copy user ID"
                >
                  {isCopied === 'userId' ? (
                    <>
                      <IconCheck className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Primary EVM Address */}
              {evmAddress && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Primary EVM Address</p>
                    <p className="font-mono text-sm break-all">{evmAddress}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(evmAddress, 'evmAddress')}
                    className="self-start sm:self-center px-3 py-1 text-sm bg-background border border-border rounded hover:bg-muted transition-colors flex items-center gap-2"
                    aria-label="Copy EVM address"
                  >
                    {isCopied === 'evmAddress' ? (
                      <>
                        <IconCheck className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <IconCopy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Balance */}
              {formattedBalance !== undefined && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Balance (Base Sepolia)</p>
                  <p className="text-2xl font-bold">{formattedBalance} ETH</p>
                </div>
              )}
            </div>
          </div>

          {/* All EVM Accounts */}
          {currentUser.evmAccounts && currentUser.evmAccounts.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-4">All EVM Accounts</h2>
              <div className="space-y-2">
                {currentUser.evmAccounts.map((account, index) => (
                  <div
                    key={account}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">Account {index + 1}</p>
                      <p className="font-mono text-sm break-all">{account}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(account, `account-${index}`)}
                      className="self-start sm:self-center px-3 py-1 text-sm bg-background border border-border rounded hover:bg-muted transition-colors flex items-center gap-2"
                      aria-label={`Copy account ${index + 1}`}
                    >
                      {isCopied === `account-${index}` ? (
                        <>
                          <IconCheck className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Accounts */}
          {currentUser.evmSmartAccounts && currentUser.evmSmartAccounts.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-4">Smart Accounts</h2>
              <div className="space-y-2">
                {currentUser.evmSmartAccounts.map((account, index) => (
                  <div
                    key={account}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">Smart Account {index + 1}</p>
                      <p className="font-mono text-sm break-all">{account}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(account, `smart-${index}`)}
                      className="self-start sm:self-center px-3 py-1 text-sm bg-background border border-border rounded hover:bg-muted transition-colors flex items-center gap-2"
                      aria-label={`Copy smart account ${index + 1}`}
                    >
                      {isCopied === `smart-${index}` ? (
                        <>
                          <IconCheck className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/wallet"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Wallet
              </Link>
              <a
                href={`https://sepolia.basescan.org/address/${evmAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                View on BaseScan
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ProfileContentWrapper() {
  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      <ProfileContent />
    </CDPReactProvider>
  )
}
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { CDPReactProvider } from "@coinbase/cdp-react";
import { useEvmAddress, useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { CDP_CONFIG } from '@/config/cdp'
import { theme } from '@/config/theme'
import SignInScreen from '@/components/wallet/SignInScreen'
import Loading from '@/components/wallet/Loading'
import AuthHeader from '@/components/wallet/AuthHeader'
import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, formatEther, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { fundWallet } from '@/lib/fund';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      <AuthContent />
    </CDPReactProvider>
  )
}

function AuthContent() {
  const { isInitialized } = useIsInitialized()
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress();
  const [balance, setBalance] = useState<bigint | undefined>(undefined);

  const getBalance = useCallback(async () => {
    if (!evmAddress) return;
    const weiBalance = await client.getBalance({
      address: evmAddress,
    });
    setBalance(weiBalance);
  }, [evmAddress]);

  useEffect(() => {
    getBalance();
    const interval = setInterval(getBalance, 500);
    return () => clearInterval(interval);
  }, [getBalance]);

  // Add auto-funding logic
  useEffect(() => {
    const checkAndFund = async () => {
      if (!evmAddress || balance === undefined) return;

      const balanceEth = Number(formatEther(balance));

      // If balance is very low (e.g., < 0.0001 ETH)
      if (balanceEth < 0.0001) {
        console.log("Low balance detected, attempting to auto-fund...");
        try {
          const result = await fundWallet({ data: evmAddress });
          if (result.success) {
            console.log("Auto-funded successfully!", result.txHash);
            getBalance(); // Refresh balance
          }
        } catch (err) {
          console.error("Failed to auto-fund:", err);
        }
      }
    };

    checkAndFund();
  }, [balance, evmAddress, getBalance]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <SignInScreen />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

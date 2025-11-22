import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

import EOATransaction from "./EOATransaction";
import WalletHeader from "./WalletHeader";
import UserBalance from "./UserBalance";

/**
 * Create a viem client to access user's balance on the Base Sepolia network
 */
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * The Signed In screen
 */
function SignedInScreen() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const [balance, setBalance] = useState<bigint | undefined>(undefined);

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
    const interval = setInterval(getBalance, 500);
    return () => clearInterval(interval);
  }, [getBalance]);

  return (
    <>
      <WalletHeader />
      <main className="py-16 px-2 w-full flex flex-col items-center justify-center flex-grow">
        <div className="gap-4 w-full flex flex-col items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 justify-between max-w-[30rem] text-center w-full">
            <UserBalance balance={formattedBalance} />
          </div>
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 justify-between max-w-[30rem] text-center w-full">
            {isSignedIn && evmAddress && (
              <EOATransaction balance={formattedBalance} onSuccess={getBalance} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default SignedInScreen;


import { useEvmAddress } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useCallback, useEffect, useState } from "react";

import { IconCheck, IconCopy, IconUser } from "./Icons";

/**
 * Header component
 */
function WalletHeader() {
  const { evmAddress } = useEvmAddress();
  const [isCopied, setIsCopied] = useState(false);

  const formatAddress = useCallback((address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const copyAddress = async () => {
    if (!evmAddress) return;
    try {
      await navigator.clipboard.writeText(evmAddress);
      setIsCopied(true);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isCopied) return;
    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  return (
    <header className="bg-card border-b border-border p-2 px-4 w-full">
      <div className="flex items-center flex-col sm:flex-row justify-between mx-auto max-w-[75rem] text-center sm:text-left">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-normal leading-tight m-0 mb-2 sm:mb-0">
            CDP React StarterKit
          </h1>
        </div>
        <div className="flex flex-row items-center justify-between w-full sm:w-auto">
          {evmAddress && (
            <button
              aria-label="copy wallet address"
              className="flex flex-row items-center bg-transparent border-0 text-foreground cursor-pointer p-0 mr-4 group"
              onClick={copyAddress}
            >
              {!isCopied && (
                <>
                  <IconUser className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto group-hover:hidden" />
                  <IconCopy className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto hidden group-hover:inline" />
                </>
              )}
              {isCopied && <IconCheck className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto" />}
              <span className="font-mono text-sm break-all">{formatAddress(evmAddress)}</span>
            </button>
          )}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

export default WalletHeader;


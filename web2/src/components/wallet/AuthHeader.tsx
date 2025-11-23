import { Link } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { SignInModal } from "@coinbase/cdp-react/components/SignInModal";
import { SignOutButton } from "@coinbase/cdp-react/components/SignOutButton";
import { IconCheck, IconCopy, IconUser } from "./Icons";
import { Button } from "../ui/button";

export default function AuthHeader() {
  const { evmAddress } = useEvmAddress();
  const [isCopied, setIsCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    <header className="px-6 py-2 flex items-center justify-between bg-background border-b border-border">
      <div className="flex items-center">
        <Link 
          to="/" 
          className="text-foreground hover:text-muted-foreground transition-colors font-medium"
        >
          Home
        </Link>
      </div>

      <div className="flex flex-row items-center gap-4">
        {evmAddress ? (
          <>
            <button
              aria-label="copy wallet address"
              className="hidden sm:flex flex-row items-center bg-transparent border-0 text-foreground cursor-pointer p-0 group hover:text-muted-foreground transition-colors"
              onClick={copyAddress}
            >
              {!isCopied && (
                <>
                  <IconUser className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto group-hover:hidden" />
                  <IconCopy className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto hidden group-hover:inline" />
                </>
              )}
              {isCopied && <IconCheck className="flex-shrink-0 flex-grow-0 h-5 mr-1 w-auto" />}
              <span className="font-mono text-sm">{formatAddress(evmAddress)}</span>
            </button>
            <SignOutButton className="!bg-secondary !rounded !px-3 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3" />
          </>
        ) : (
          <>
            <Button onClick={() => setShowAuthModal(true)}>
              Connect Wallet
            </Button>
            <SignInModal open={showAuthModal} setIsOpen={setShowAuthModal} />
          </>
        )}
      </div>
    </header>
  )
}

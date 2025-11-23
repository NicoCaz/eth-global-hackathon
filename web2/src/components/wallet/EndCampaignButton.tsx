import { useEvmAddress } from "@coinbase/cdp-hooks";
import { SendEvmTransactionButton } from "@coinbase/cdp-react/components/SendEvmTransactionButton";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData, createPublicClient, http, toHex, getContract } from "viem";
import { baseSepolia } from "viem/chains";
import { PROJECT_RAFFLE_ABI, ENTROPY_ABI } from "@/constants/abi";
import { Loader2, AlertCircle } from "lucide-react";

interface EndCampaignButtonProps {
  campaignAddress: string;
  donationCount: number;
  onCampaignEnded?: () => void;
}

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

enum RaffleState {
  Active = 0,
  EntropyRequested = 1,
  DrawExecuted = 2,
}

export function EndCampaignButton({
  campaignAddress,
  donationCount,
  onCampaignEnded,
}: EndCampaignButtonProps) {
  const { evmAddress } = useEvmAddress();
  
  // State management
  const [contractState, setContractState] = useState<RaffleState | null>(null);
  const [entropyFee, setEntropyFee] = useState<bigint | null>(null);
  const [userRandomNumber, setUserRandomNumber] = useState<`0x${string}` | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Fetch contract state and entropy fee
  useEffect(() => {
    const fetchContractData = async () => {
      if (!campaignAddress) return;
      
      try {
        setIsLoadingState(true);
        setInternalError(null);

        const contract = getContract({
          address: campaignAddress as `0x${string}`,
          abi: PROJECT_RAFFLE_ABI,
          client: client,
        });

        // Read contract state
        const state = await contract.read.state();
        setContractState(state as RaffleState);

        // If Active, fetch entropy fee
        if (state === RaffleState.Active) {
          // Generate random number once
          if (!userRandomNumber) {
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            setUserRandomNumber(toHex(randomBytes));
          }

          // Get entropy provider and entropy contract addresses
          const entropyProvider = await contract.read.entropyProvider();
          const entropyAddress = await contract.read.getEntropy();

          // Get fee from entropy contract
          const entropyContract = getContract({
            address: entropyAddress,
            abi: ENTROPY_ABI,
            client: client,
          });

          const fee = await entropyContract.read.getFee([entropyProvider]);
          setEntropyFee(fee);
        }
      } catch (e) {
        console.error("Error fetching contract data:", e);
        setInternalError(e instanceof Error ? e.message : "Failed to load campaign state");
      } finally {
        setIsLoadingState(false);
      }
    };

    fetchContractData();
  }, [campaignAddress, userRandomNumber]);

  // Construct the transaction
  const transaction = useMemo(() => {
    // Reset error when dependencies change
    setInternalError(null);

    // Check all required conditions
    if (contractState !== RaffleState.Active) return undefined;
    if (donationCount === 0) return undefined;
    if (!userRandomNumber) return undefined;
    if (!entropyFee) return undefined;
    if (!campaignAddress) return undefined;

    try {
      const data = encodeFunctionData({
        abi: PROJECT_RAFFLE_ABI,
        functionName: "requestEntropy",
        args: [userRandomNumber],
      });

      return {
        to: campaignAddress as `0x${string}`,
        value: entropyFee,
        data,
        chainId: 84532, // Base Sepolia
        type: 'eip1559' as const,
      };
    } catch (e) {
      console.error("Error constructing transaction:", e);
      return undefined;
    }
  }, [contractState, donationCount, userRandomNumber, entropyFee, campaignAddress]);

  const handleSuccess = async (hash: string) => {
    setTxHash(hash);
    setIsWaitingForReceipt(true);
    setInternalError(null);
    
    try {
      await client.waitForTransactionReceipt({ 
        hash: hash as `0x${string}` 
      });
      
      // Campaign successfully ended
      if (onCampaignEnded) {
        onCampaignEnded();
      }

      // Update state to reflect the change
      setContractState(RaffleState.EntropyRequested);
    } catch (e) {
      console.error("Error waiting for receipt:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to verify transaction";
      setInternalError(errorMessage);
    } finally {
      setIsWaitingForReceipt(false);
      setTxHash(null);
    }
  };

  const handleError = (error: Error | { message: string }) => {
    console.error("Transaction error:", error);
    const errorMessage = error.message || "Transaction failed";
    setInternalError(errorMessage);
    setIsWaitingForReceipt(false);
    setTxHash(null);
  };

  // Render states
  if (!evmAddress) {
    return (
      <Button disabled variant="outline" className="w-full">
        Connect Wallet to Manage
      </Button>
    );
  }

  if (isWaitingForReceipt) {
    return (
      <div className="w-full space-y-2">
        <Button disabled className="w-full" variant="secondary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </Button>
        {txHash && (
          <div className="text-xs text-center">
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on Explorer
            </a>
          </div>
        )}
      </div>
    );
  }

  if (isLoadingState) {
    return (
      <Button disabled variant="outline" className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (donationCount === 0) {
    return (
      <div className="w-full space-y-2">
        <Button disabled variant="outline" className="w-full">
          No Tickets Sold
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          At least one ticket must be sold to end the campaign.
        </p>
      </div>
    );
  }

  if (contractState !== RaffleState.Active) {
    const stateText = contractState === RaffleState.EntropyRequested 
      ? "Waiting for Draw" 
      : contractState === RaffleState.DrawExecuted 
      ? "Campaign Ended" 
      : "Not Active";
    
    return (
      <Button disabled variant="outline" className="w-full">
        {stateText}
      </Button>
    );
  }

  // Ready to end campaign
  return (
    <div className="w-full space-y-2">
      {internalError && (
        <div className="bg-destructive/15 text-destructive px-3 py-2 rounded text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{internalError}</p>
        </div>
      )}

      {!transaction ? (
        <Button disabled className="w-full">
          Preparing Transaction...
        </Button>
      ) : (
        <SendEvmTransactionButton
          className="w-full"
          account={evmAddress}
          network="base-sepolia"
          transaction={transaction}
          onSuccess={handleSuccess}
          onError={handleError}
        >
          <span className="w-full">End Campaign</span>
        </SendEvmTransactionButton>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        Requires a small fee for randomness
      </p>
    </div>
  );
}

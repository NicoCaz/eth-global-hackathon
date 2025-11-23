import { useEvmAddress, useCurrentUser } from "@coinbase/cdp-hooks";
import { SendEvmTransactionButton } from "@coinbase/cdp-react/components/SendEvmTransactionButton";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { encodeFunctionData, createPublicClient, http, decodeEventLog } from "viem";
import { baseSepolia } from "viem/chains";
import { CAMPAIGN_FACTORY_ADDRESS } from "@/constants/web3";
import { RAFFLE_FACTORY_ABI } from "@/constants/abi";
import { Loader2, AlertCircle } from "lucide-react";

interface DeployCampaignButtonProps {
  title: string;
  description: string;
  projectPercentage: number;
  goalAmount: string; // Not used in contract but part of form
  endDate: string;
  disabled?: boolean;
  onCampaignDeployed: (data: {
    contractAddress: string;
    creatorWalletAddress: string;
    creatorUserId: string;
  }) => void;
  onError?: (error: Error) => void;
}

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export function DeployCampaignButton({
  title,
  description,
  projectPercentage,
  endDate,
  onCampaignDeployed,
  onError,
}: DeployCampaignButtonProps) {
  const { evmAddress } = useEvmAddress();
  const { currentUser } = useCurrentUser();
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Construct the transaction
  const transaction = useMemo(() => {
    // Reset error when inputs change
    setInternalError(null);

    if (!title || !description || !endDate || !projectPercentage || !evmAddress) return undefined;

    try {
      // Calculate duration in seconds
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const durationSeconds = 60 //Math.max(0, Math.floor((end - now) / 1000));

      // Basis points (1% = 100)
      const percentageBasisPoints = Math.floor(projectPercentage * 100);

      // Validation to prevent "unable to estimate gas" errors
      if (durationSeconds <= 0) {
        // Duration must be positive. We return undefined to disable the button
        // until the user selects a valid future date.
        return undefined;
      }

      if (percentageBasisPoints <= 0 || percentageBasisPoints > 10000) {
        return undefined;
      }

      // Encode function data
      const data = encodeFunctionData({
        abi: RAFFLE_FACTORY_ABI,
        functionName: "createRaffle",
        args: [
          title,
          description,
          BigInt(percentageBasisPoints),
          evmAddress as `0x${string}`, // Project address is the creator's address for now
          BigInt(durationSeconds),
        ],
      });

      return {
        to: CAMPAIGN_FACTORY_ADDRESS as `0x${string}`,
        value: 0n,
        data,
        chainId: 84532, // Base Sepolia
        type: 'eip1559' as const,
      };
    } catch (e) {
      console.error("Error constructing transaction:", e);
      return undefined;
    }
  }, [title, description, endDate, projectPercentage, evmAddress]);

  const handleSuccess = async (hash: string) => {
    setTxHash(hash);
    setIsWaitingForReceipt(true);
    setInternalError(null);
    
    try {
      const receipt = await client.waitForTransactionReceipt({ 
        hash: hash as `0x${string}` 
      });

      // Find the RaffleCreated event
      let raffleAddress: string | undefined;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: RAFFLE_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "RaffleCreated") {
            raffleAddress = decoded.args.raffleAddress;
            break;
          }
        } catch (e) {
          // Ignore logs that don't match our event
          continue;
        }
      }

      if (raffleAddress && evmAddress && currentUser?.userId) {
        onCampaignDeployed({
          contractAddress: raffleAddress,
          creatorWalletAddress: evmAddress,
          creatorUserId: currentUser.userId,
        });
      } else {
        throw new Error("Could not find RaffleCreated event in transaction receipt");
      }
    } catch (e) {
      console.error("Error waiting for receipt:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to verify transaction";
      setInternalError(errorMessage);
      onError?.(e instanceof Error ? e : new Error(errorMessage));
    } finally {
      setIsWaitingForReceipt(false);
      setTxHash(null);
    }
  };

  const handleError = (error: Error | { message: string }) => {
    console.error("Transaction error:", error);
    const errorMessage = error.message || "Transaction failed";
    setInternalError(errorMessage);
    onError?.(error instanceof Error ? error : new Error(errorMessage));
    setIsWaitingForReceipt(false);
    setTxHash(null);
  };

  if (isWaitingForReceipt) {
    return (
      <div className="w-full space-y-4">
        <Button disabled className="w-full" variant="secondary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying to Base Sepolia...
        </Button>
        <div className="text-sm text-center text-muted-foreground">
          <p>Please wait while we confirm your transaction.</p>
          {txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on Block Explorer
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!evmAddress) {
    return (
      <Button disabled variant="outline" className="w-full">
        Connect Wallet to Create
      </Button>
    );
  }

  return (
    <div className="w-full space-y-4">
      {internalError && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h5 className="font-medium mb-1">Deployment Error</h5>
            <p>{internalError}</p>
          </div>
        </div>
      )}

      {!transaction ? (
        <Button disabled className="w-full">
          {(!title || !description || !endDate) ? "Fill form to Create Campaign" : "Invalid Campaign Settings"}
        </Button>
      ) : (
        // @ts-ignore - types mismatch between cdp-react and local prop types
        <SendEvmTransactionButton
          className="w-full"
          account={evmAddress}
          network="base-sepolia"
          transaction={transaction}
          onSuccess={handleSuccess}
          onError={handleError}
        >
          <span className="w-full">Create Campaign (On-Chain)</span>
        </SendEvmTransactionButton>
      )}
    </div>
  );
}

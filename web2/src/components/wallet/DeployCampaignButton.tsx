import { useEvmAddress, useCurrentUser } from "@coinbase/cdp-hooks";
import { SendEvmTransactionButton } from "@coinbase/cdp-react/components/SendEvmTransactionButton";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { encodeFunctionData, createPublicClient, http, decodeEventLog } from "viem";
import { baseSepolia } from "viem/chains";
import { CAMPAIGN_FACTORY_ADDRESS } from "@/constants/web3";
import { RAFFLE_FACTORY_ABI } from "@/constants/abi";
import { Loader2 } from "lucide-react";

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
  disabled,
  onCampaignDeployed,
  onError,
}: DeployCampaignButtonProps) {
  const { evmAddress } = useEvmAddress();
  const { currentUser } = useCurrentUser();
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Construct the transaction
  const transaction = useMemo(() => {
    if (!title || !description || !endDate || !projectPercentage) return undefined;

    try {
      // Calculate duration in seconds
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const durationSeconds = Math.max(0, Math.floor((end - now) / 1000));

      // Basis points (1% = 100)
      const percentageBasisPoints = Math.floor(projectPercentage * 100);

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
      onError?.(e instanceof Error ? e : new Error("Failed to verify transaction"));
    } finally {
      setIsWaitingForReceipt(false);
      setTxHash(null);
    }
  };

  const handleError = (error: Error | { message: string }) => {
    console.error("Transaction error:", error);
    onError?.(error instanceof Error ? error : new Error(error.message));
    setIsWaitingForReceipt(false);
    setTxHash(null);
  };

  if (isWaitingForReceipt) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-2 bg-secondary/50 rounded-lg animate-in fade-in">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium">Deploying to Base Sepolia...</span>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Please wait while we confirm your transaction on the blockchain.
          <br />
          This usually takes 10-20 seconds.
        </p>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on Explorer
          </a>
        )}
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

  if (!transaction) {
    return (
      <Button disabled className="w-full">
        Fill form to Create Campaign
      </Button>
    );
  }

  return (
    <div className="w-full">
       {/* @ts-ignore - types mismatch between cdp-react and local prop types */}
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
    </div>
  );
}


import { useEvmAddress } from "@coinbase/cdp-hooks";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getCampaignState, endCampaign } from "@/lib/campaign-actions";

interface EndCampaignButtonProps {
  campaignAddress: string;
  donationCount: number;
  onCampaignEnded?: () => void;
}

export function EndCampaignButton({
  campaignAddress,
  donationCount,
  onCampaignEnded,
}: EndCampaignButtonProps) {
  const { evmAddress } = useEvmAddress();
  
  // State management
  const [campaignState, setCampaignState] = useState<{ status: string; creatorWalletAddress: string } | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Fetch campaign state
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!campaignAddress || !evmAddress) return;
      
      try {
        setIsLoadingState(true);
        setInternalError(null);

        const state = await getCampaignState({ data: campaignAddress });
        setCampaignState(state);

      } catch (e) {
        console.error("Error fetching campaign data:", e);
        setInternalError(e instanceof Error ? e.message : "Failed to load campaign state");
      } finally {
        setIsLoadingState(false);
      }
    };

    fetchCampaignData();
  }, [campaignAddress, evmAddress]);

  const handleEndCampaign = async () => {
    if (!campaignAddress || !evmAddress) return;

    try {
      setIsProcessing(true);
      setInternalError(null);

      const result = await endCampaign({
        data: {
          contractAddress: campaignAddress,
          userAddress: evmAddress,
        },
      });

      if (result.success) {
        // Refresh state
        setCampaignState((prev) => prev ? { ...prev, status: 'winner_selected' } : null);
        
        if (onCampaignEnded) {
          onCampaignEnded();
        }
      }
    } catch (e) {
      console.error("Error ending campaign:", e);
      setInternalError(e instanceof Error ? e.message : "Failed to end campaign");
    } finally {
      setIsProcessing(false);
    }
  };

  // Render states
  if (!evmAddress) {
    return (
      <Button disabled variant="outline" className="w-full">
        Connect Wallet to Manage
      </Button>
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

  // Check if authorized
  const isAuthorized = campaignState?.creatorWalletAddress.toLowerCase() === evmAddress.toLowerCase();
  
  if (campaignState && !isAuthorized) {
    return (
      <div className="w-full space-y-2">
         <Button disabled variant="outline" className="w-full">
          Not Authorized
        </Button>
      </div>
    );
  }

  if (campaignState?.status !== 'active') {
    const stateText = campaignState?.status === 'winner_selected' 
      ? "Winner Selected" 
      : campaignState?.status === 'ended' 
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

      <Button 
        className="w-full" 
        onClick={handleEndCampaign}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Selecting Winner...
          </>
        ) : (
          "End Campaign & Pick Winner"
        )}
      </Button>
      
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>This will randomly select a winner from the donors.</p>
      </div>
    </div>
  );
}

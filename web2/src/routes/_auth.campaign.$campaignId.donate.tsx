import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { campaigns, donations } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, AlertCircle, Wallet, CheckCircle2, Home } from 'lucide-react'
import { useState, useMemo } from 'react'
import { z } from 'zod'
import { useEvmAddress, useCurrentUser } from "@coinbase/cdp-hooks"
import { SendEvmTransactionButton } from "@coinbase/cdp-react/components/SendEvmTransactionButton"
import { encodeFunctionData, parseEther, createPublicClient, http, decodeEventLog } from "viem"
import { baseSepolia } from "viem/chains"
import { PROJECT_RAFFLE_ABI } from "@/constants/abi"

const getCampaign = createServerFn({
  method: 'GET',
})
.inputValidator((data: unknown) => {
  return z.string().parse(data)
})
.handler(async ({ data: campaignId }) => {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId)
  })
  return campaign
})

const recordDonation = createServerFn({
  method: 'POST',
})
.inputValidator((data: unknown) => {
  return z.object({
    campaignId: z.string(),
    donorAddress: z.string(),
    donorUserId: z.string().optional(),
    amount: z.string(),
    txHash: z.string(),
    blockNumber: z.number().optional(),
  }).parse(data)
})
.handler(async ({ data }) => {
  // 1. Insert donation
  await db.insert(donations).values({
    campaignId: data.campaignId,
    donorWalletAddress: data.donorAddress,
    donorUserId: data.donorUserId ?? null,
    amount: data.amount,
    txHash: data.txHash,
    blockNumber: data.blockNumber,
  })

  // 2. Update campaign
  // We need to fetch the rafflePercentage first to calculate the pot
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, data.campaignId),
    columns: {
      rafflePercentage: true
    }
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  // Calculate raffle amount
  await db.update(campaigns)
    .set({
      totalRaised: sql`${campaigns.totalRaised} + ${data.amount}::numeric`,
      rafflePot: sql`${campaigns.rafflePot} + (${data.amount}::numeric * ${campaign.rafflePercentage} / 100)`,
      donationCount: sql`${campaigns.donationCount} + 1`
    })
    .where(eq(campaigns.id, data.campaignId))
  
  return { success: true }
})

export const Route = createFileRoute('/_auth/campaign/$campaignId/donate')({
  component: DonationPage,
  loader: async ({ params }) => {
    const campaign = await getCampaign({ data: params.campaignId })
    if (!campaign) {
      throw notFound()
    }
    return campaign
  },
})

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function DonationPage() {
  const campaign = Route.useLoaderData()
  const { evmAddress } = useEvmAddress()
  const { currentUser } = useCurrentUser()
  
  const [amount, setAmount] = useState("")
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [internalError, setInternalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Construct the transaction
  const transaction = useMemo(() => {
    setInternalError(null)

    if (!amount || !evmAddress || !campaign.contractAddress) return undefined

    try {
      const parsedAmount = parseEther(amount)
      
      if (parsedAmount <= 0n) return undefined

      // Encode function data for buyTickets
      const data = encodeFunctionData({
        abi: PROJECT_RAFFLE_ABI,
        functionName: "buyTickets",
        args: [],
      })

      return {
        to: campaign.contractAddress as `0x${string}`,
        value: parsedAmount,
        data,
        chainId: 84532, // Base Sepolia
        type: 'eip1559' as const,
      }
    } catch (e) {
      console.error("Error constructing transaction:", e)
      return undefined
    }
  }, [amount, evmAddress, campaign.contractAddress])

  const handleSuccess = async (hash: string) => {
    setTxHash(hash)
    setIsWaitingForReceipt(true)
    setInternalError(null)
    
    try {
      const receipt = await client.waitForTransactionReceipt({ 
        hash: hash as `0x${string}` 
      })

      // Verify the TicketPurchased event
      let ticketPurchased = false
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: PROJECT_RAFFLE_ABI,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === "TicketPurchased") {
            ticketPurchased = true
            break
          }
        } catch (e) {
          continue
        }
      }

      if (ticketPurchased) {
        // Record donation in database
        try {
          await recordDonation({
            data: {
              campaignId: campaign.id,
              donorAddress: evmAddress as string,
              donorUserId: currentUser?.userId,
              amount: amount,
              txHash: hash,
              blockNumber: Number(receipt.blockNumber),
            }
          })
          setIsSuccess(true)
        } catch (dbError) {
           console.error("Failed to record donation in DB:", dbError)
           // If DB update fails but transaction succeeded, we still show success
           // but maybe log the error.
           setIsSuccess(true)
        }
      } else {
        throw new Error("Transaction confirmed but TicketPurchased event not found")
      }
    } catch (e) {
      console.error("Error waiting for receipt:", e)
      const errorMessage = e instanceof Error ? e.message : "Failed to verify transaction"
      setInternalError(errorMessage)
    } finally {
      setIsWaitingForReceipt(false)
      // Don't clear txHash immediately so we can show it in success screen if needed,
      // but here we are switching to isSuccess state.
    }
  }

  const handleError = (error: Error | { message: string }) => {
    console.error("Transaction error:", error)
    const errorMessage = error.message || "Transaction failed"
    setInternalError(errorMessage)
    setIsWaitingForReceipt(false)
    setTxHash(null)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Donation Successful!</CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Thank you for supporting <strong>{campaign.title}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Your donation of {amount} ETH has been processed and your tickets have been assigned.
            </p>
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm block mt-2"
              >
                View Transaction
              </a>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" asChild>
              <Link to="/campaign/$campaignId" params={{ campaignId: campaign.id }}>
                Back to Campaign
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isWaitingForReceipt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Processing Donation</CardTitle>
            <CardDescription className="text-center">
              Please wait while we confirm your transaction on the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Confirming transaction...</p>
            </div>
            {txHash && (
              <div className="text-center">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  View on Block Explorer
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" asChild className="mb-4 pl-0 hover:pl-0 hover:bg-transparent">
          <Link to="/campaign/$campaignId" params={{ campaignId: campaign.id }} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaign
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Donate to {campaign.title}</CardTitle>
            <CardDescription>
              Support this project by purchasing tickets. {campaign.rafflePercentage}% of your donation goes to the raffle pot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!evmAddress ? (
              <div className="text-center py-4">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">Please connect your wallet to donate.</p>
                {/* Wallet connection is handled by the AuthLayout/Header, but we can show a message */}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum donation: 0.0001 ETH
                  </p>
                </div>

                {internalError && (
                  <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p>{internalError}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            {!evmAddress ? (
              <Button disabled className="w-full">Wallet Not Connected</Button>
            ) : !transaction ? (
              <Button disabled className="w-full">Enter Amount to Donate</Button>
            ) : (
              // @ts-ignore - types mismatch
              <SendEvmTransactionButton
                className="w-full"
                account={evmAddress}
                network="base-sepolia"
                transaction={transaction}
                onSuccess={handleSuccess}
                onError={handleError}
              >
                <span className="w-full">Donate {amount} ETH</span>
              </SendEvmTransactionButton>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { campaigns, raffleWinners } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Clock, Target, Trophy, ExternalLink, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const getCampaign = createServerFn({
  method: 'GET',
})
.inputValidator((data: unknown) => {
  const campaignId = z.string().parse(data)
  return campaignId
})
.handler(async ({ data: campaignId }) => {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId)
  })

  if (!campaign) {
    return null
  }

  const winner = await db.query.raffleWinners.findFirst({
    where: eq(raffleWinners.campaignId, campaignId)
  })

  return { campaign, winner }
})

export const Route = createFileRoute('/campaign/$campaignId')({
  component: CampaignDetail,
  loader: async ({ params }) => {
    const data = await getCampaign({ data: params.campaignId })
    if (!data) {
      throw notFound()
    }
    return data
  },
  notFoundComponent: () => {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    )
  }
})

function formatTimeRemaining(endDate: string | Date): string {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Ended'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h remaining`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }
  return `${minutes}m remaining`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="border-green-500/50 text-green-500">Active</Badge>
    case 'ended':
      return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Ended</Badge>
    case 'winner_selected':
      return <Badge variant="outline" className="border-blue-500/50 text-blue-500">Winner Selected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function CampaignDetail() {
  const { campaign, winner } = Route.useLoaderData()
  const [timeRemaining, setTimeRemaining] = useState<string>(formatTimeRemaining(campaign.endDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(campaign.endDate))
    }, 60000)

    return () => clearInterval(interval)
  }, [campaign.endDate])

  const totalRaised = Number.parseFloat(campaign.totalRaised)
  const goalAmount = campaign.goalAmount ? Number.parseFloat(campaign.goalAmount) : null
  const progressPercentage = goalAmount ? Math.min((totalRaised / goalAmount) * 100, 100) : 0
  const rafflePot = Number.parseFloat(campaign.rafflePot)

  const isEnded = campaign.status === 'ended' || campaign.status === 'winner_selected'

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header / Nav */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Content (Left Column) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Header Section */}
            <div className="flex gap-4">
              <div className="shrink-0">
                {campaign.logo ? (
                  <img
                    src={campaign.logo}
                    alt={campaign.title}
                    className="w-20 h-20 rounded-lg object-cover bg-secondary"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <Target className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">{campaign.title}</h1>
                <div className="flex items-center gap-3">
                  {getStatusBadge(campaign.status)}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeRemaining}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-2">About this campaign</h3>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {campaign.description}
              </p>
            </div>

            {/* Blockchain Details */}
            <div className="bg-secondary/20 rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Blockchain Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-muted-foreground">Contract Address:</span>
                  <code className="bg-secondary/50 px-2 py-0.5 rounded text-xs font-mono break-all">
                    {campaign.contractAddress}
                  </code>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-muted-foreground">Creator Address:</span>
                  <code className="bg-secondary/50 px-2 py-0.5 rounded text-xs font-mono break-all">
                    {campaign.creatorWalletAddress}
                  </code>
                </div>
              </div>
            </div>

            {/* Winner Section (Conditional) */}
            {winner && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-full text-blue-500">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-500">Raffle Winner Selected!</h3>
                    <p className="text-sm text-blue-400">
                      The fair raffle system has selected a winner.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-background/50 p-3 rounded border border-border">
                    <span className="block text-muted-foreground text-xs mb-1">Prize Won</span>
                    <span className="text-lg font-bold">{Number.parseFloat(winner.prizeAmount).toFixed(4)} ETH</span>
                  </div>
                  <div className="bg-background/50 p-3 rounded border border-border">
                    <span className="block text-muted-foreground text-xs mb-1">Winner Address</span>
                    <code className="text-xs font-mono break-all">{winner.winnerWalletAddress}</code>
                  </div>
                  <div className="col-span-full bg-background/50 p-3 rounded border border-border">
                    <span className="block text-muted-foreground text-xs mb-1">Transaction Hash</span>
                    <code className="text-xs font-mono break-all">{winner.txHash}</code>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar (Right Column) */}
          <div className="space-y-6">
            
            {/* Funding Card */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm sticky top-6">
              
              {/* Prize Pot Highlight */}
              <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-lg flex flex-col items-center text-center">
                 <div className="text-sm font-medium text-amber-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                   <Trophy className="w-4 h-4" />
                   Win Potential
                 </div>
                 <div className="text-3xl font-bold text-foreground tabular-nums">
                   {rafflePot.toFixed(4)} <span className="text-lg font-normal text-muted-foreground">ETH</span>
                 </div>
                 <div className="text-xs text-muted-foreground mt-1">
                   Current Prize Pot
                 </div>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold">{totalRaised.toFixed(4)}</span>
                  <span className="text-lg text-muted-foreground font-medium mb-1">ETH</span>
                </div>
                
                {goalAmount ? (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>raised of {goalAmount} ETH goal</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2 mb-4" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">Total raised so far</p>
                )}

                <div className="grid grid-cols-1 gap-4 py-4 border-t border-border text-center">
                  <div>
                    <div className="text-2xl font-bold">{campaign.donationCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Donors</div>
                  </div>
                </div>
              </div>

<Link to="/campaign/$campaignId/donate" params={{ campaignId: campaign.id }}>
              <Button 
                className="w-full text-lg py-6" 
                size="lg"
                disabled={isEnded}
              >
                {isEnded ? 'Campaign Ended' : 'Back this project'}
              </Button>
              </Link>
              
              <p className="text-center text-xs text-muted-foreground mt-3">
                {campaign.rafflePercentage}% of your donation goes to the raffle pot.
              </p>
            </div>

            {/* Share / Extra Info */}
            <div className="flex flex-col gap-2">
               {/* Placeholder for future functionality */}
               <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-2">
                  <Share2 className="w-4 h-4" />
                  <span>Share this campaign</span>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, Target, Trophy } from 'lucide-react'

export interface Campaign {
  id: string
  contractAddress: string
  creatorUserId: string
  creatorWalletAddress: string
  title: string
  description: string
  logo: string | null
  logoMimeType: string | null
  rafflePercentage: number
  goalAmount: string | null
  endDate: Date
  status: string
  totalRaised: string
  rafflePot: string
  donationCount: number
  createdAt: Date
  updatedAt: Date
}

interface CampaignCardProps {
  campaign: Campaign
}

function formatTimeRemaining(endDate: Date): string {
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
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
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

export function CampaignCard({ campaign }: CampaignCardProps) {
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

  return (
    <div className="group flex flex-col md:flex-row gap-4 p-4 border border-border rounded-lg bg-card hover:bg-secondary/30 transition-colors">
      {/* Icon / Image */}
      <div className="shrink-0">
        {campaign.logo ? (
          <img
            src={campaign.logo}
            alt={campaign.title}
            className="w-16 h-16 rounded object-cover bg-secondary"
          />
        ) : (
          <div className="w-16 h-16 rounded bg-secondary flex items-center justify-center text-muted-foreground">
            <Target className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-start">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold truncate text-foreground">
            {campaign.title}
          </h3>
          {getStatusBadge(campaign.status)}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {campaign.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timeRemaining} left</span>
          </div>
        </div>
        <div className="flex-1"></div>




        <div className="w-full">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium tabular-nums mb-1.5">
              {totalRaised.toFixed(4)} <span className="text-muted-foreground font-normal text-xs">ETH raised</span>
            </span>
            {goalAmount && (
              <span className="text-xs text-muted-foreground tabular-nums">
                of {goalAmount} ETH
              </span>
            )}
          </div>
          {goalAmount && (
            <Progress value={progressPercentage} className="h-1.5" />
          )}
        </div>
      </div>

      {/* Right Actions / Stats */}
      <div className="shrink-0 flex flex-col md:items-end justify-center gap-1.5 md:w-52 md:pl-6 md:border-l border-border/40">
        
        {/* Pot Highlight */}
        <div className="w-full flex flex-col md:items-end">
           <div className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
             <Trophy className="w-3.5 h-3.5" />
             Win Potential
           </div>
           <div className="text-2xl font-bold text-foreground tabular-nums">
             {Number.parseFloat(campaign.rafflePot).toFixed(4)} <span className="text-sm font-normal text-muted-foreground">ETH</span>
           </div>
        </div>

        <div className="w-full flex-1"></div>

        <p className="text-xs text-muted-foreground">
          {campaign.rafflePercentage}% to the raffle pot.
        </p>

        <Button 
          variant={campaign.status === 'active' ? 'default' : 'secondary'}
          size="sm"
          className="w-full"
          asChild
        >
          <Link to="/campaign/$campaignId" params={{ campaignId: campaign.id }}>
            {campaign.status === 'active' ? 'Back Project' : 'View Details'}
          </Link>
        </Button>
      </div>
    </div>
  )
}

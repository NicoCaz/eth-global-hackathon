import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { campaigns } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { OwnerCampaignCard } from '@/components/OwnerCampaignCard'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEvmAddress } from '@coinbase/cdp-hooks'
import { useEffect, useState, useCallback } from 'react'
import Loading from '@/components/wallet/Loading'

const getUserCampaigns = createServerFn({
  method: 'GET',
})
  .inputValidator((address: string) => address)
  .handler(async ({ data: address }) => {
    return await db.query.campaigns.findMany({
      where: eq(campaigns.creatorWalletAddress, address),
      orderBy: [asc(campaigns.endDate)],
    })
  })

export const Route = createFileRoute('/_auth/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { evmAddress } = useEvmAddress()
  const [userCampaigns, setUserCampaigns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCampaigns = useCallback(async () => {
    if (evmAddress) {
      // Don't set loading to true on refreshes to avoid flicker
      // Only set if it's the initial load (userCampaigns empty)
      if (userCampaigns.length === 0) {
        setIsLoading(true)
      }
      
      try {
        const data = await getUserCampaigns({ data: evmAddress })
        setUserCampaigns(data)
      } catch (error) {
        console.error('Failed to fetch user campaigns:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [evmAddress, userCampaigns.length])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 border-b border-border pb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-1">Your Campaigns</h2>
        </div>

        {userCampaigns.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-lg">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              You haven't created any campaigns yet.
            </p>
            <Button asChild>
              <Link to="/campaign/create" className="flex items-center gap-2">
                Create Campaign
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {userCampaigns.map((campaign) => (
              <OwnerCampaignCard
                key={campaign.id}
                campaign={campaign}
                onCampaignUpdate={fetchCampaigns}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  </div>
  )
}

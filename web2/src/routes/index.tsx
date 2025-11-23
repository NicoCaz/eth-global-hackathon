import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { campaigns } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { CampaignCard } from '@/components/CampaignCard'
import { Sparkles, Trophy, Zap } from 'lucide-react'

const getCampaigns = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.campaigns.findMany({
    orderBy: [asc(campaigns.endDate)],
  })
})

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => await getCampaigns(),
})

function App() {
  const campaigns = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Kickstarter meets Lottery.
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 font-light max-w-2xl leading-relaxed">
              Fund innovative projects. Back the projects you believe in, and you might just become the lucky winner of the prize pool. Crowdfunding reimagined.
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Blockchain Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Fair Raffle System</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Support Innovation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 border-b border-border pb-4">
            <h2 className="text-xl font-semibold mb-1">
              Active Campaigns
            </h2>
          </div>

          {campaigns.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-lg">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No campaigns yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <p className="text-muted-foreground text-sm">
            Powered by blockchain technology.
          </p>
        </div>
      </footer>
    </div>
  )
}

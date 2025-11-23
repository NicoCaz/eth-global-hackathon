import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { campaigns } from '@/db/schema'
import { asc, desc } from 'drizzle-orm'
import { CampaignCard } from '@/components/CampaignCard'
import { ArrowRight, Plus, Sparkles, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const getCampaigns = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.campaigns.findMany({
    orderBy: [asc(campaigns.status), desc(campaigns.rafflePot), asc(campaigns.endDate)],
  })
})

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => await getCampaigns(),
})

function App() {
  const campaigns = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute top-0 left-0 z-10 flex items-center gap-2 !w-full justify-between p-4">

<span className="font-medium text-foreground/90">tanly.app</span>

        <Link to="/dashboard" className="text-sm font-medium hover:text-muted-foreground flex items-center gap-1">
          Dashboard
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className=" text-center flex flex-col items-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Kickstarter meets Lottery.
            </h1>
            
            <p className="text-xl text-center text-muted-foreground mb-8 font-light max-w-2xl leading-relaxed">
              Support creators and stand a chance to win. A portion of every pledge goes into a prize pot awarded to one lucky backer. Crowdfunding with a reward.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-primary/90">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Win the Prize Pot</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Blockchain Verified</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Support Innovation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 border-b border-border pb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold mb-1">
              Active Campaigns
            </h2>

            <Button variant="secondary" size="sm" asChild>
              <Link to="/campaign/create" className="flex items-center gap-2">
                Create Campaign
                <Plus className="size-3" />
              </Link>
            </Button>
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
          <p className="text-muted-foreground text-sm text-center">
            Powered by blockchain technology.
          </p>
        </div>
      </footer>
    </div>
  )
}

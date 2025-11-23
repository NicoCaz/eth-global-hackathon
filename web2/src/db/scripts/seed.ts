import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { db } from '../index.js'
import { campaigns, donations, raffleWinners } from '../schema.js'

// Load environment variables
config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface SeedData {
  campaigns: Array<{
    contractAddress: string
    creatorUserId: string
    creatorWalletAddress: string
    title: string
    description: string
    logo: string
    logoMimeType: string
    rafflePercentage: number
    goalAmount: string
    endDate: string
    status: string
    totalRaised: string
    rafflePot: string
    donationCount: number
  }>
  donations: Array<{
    campaignContractAddress: string
    donorUserId: string | null
    donorWalletAddress: string
    amount: string
    txHash: string
    blockNumber: number
  }>
  raffleWinners: Array<{
    campaignContractAddress: string
    winnerUserId: string | null
    winnerWalletAddress: string
    prizeAmount: string
    txHash: string
    blockNumber: number
    randomSeed: string
  }>
}

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Read seed data
    const seedDataPath = join(__dirname, 'seed-data.json')
    const seedDataRaw = readFileSync(seedDataPath, 'utf-8')
    const seedData: SeedData = JSON.parse(seedDataRaw)

    // Read logo files and convert to base64
    const logoCache: Record<string, string> = {}
    
    for (const campaign of seedData.campaigns) {
      if (campaign.logo && !logoCache[campaign.logo]) {
        try {
          const logoPath = join(__dirname, campaign.logo)
          const logoBuffer = readFileSync(logoPath)
          logoCache[campaign.logo] = `data:${campaign.logoMimeType};base64,${logoBuffer.toString('base64')}`
          console.log(`✓ Loaded logo: ${campaign.logo}`)
        } catch (error) {
          console.warn(`⚠ Could not load logo ${campaign.logo}, using null`)
          logoCache[campaign.logo] = ''
        }
      }
    }

    // Insert campaigns
    console.log('\n📝 Inserting campaigns...')
    const insertedCampaigns = await db.insert(campaigns).values(
      seedData.campaigns.map(c => ({
        contractAddress: c.contractAddress,
        creatorUserId: c.creatorUserId,
        creatorWalletAddress: c.creatorWalletAddress,
        title: c.title,
        description: c.description,
        logo: logoCache[c.logo] || null,
        logoMimeType: c.logoMimeType,
        rafflePercentage: c.rafflePercentage,
        goalAmount: c.goalAmount,
        endDate: new Date(c.endDate),
        status: c.status,
        totalRaised: c.totalRaised,
        rafflePot: c.rafflePot,
        donationCount: c.donationCount,
      }))
    ).returning()

    console.log(`✓ Inserted ${insertedCampaigns.length} campaigns`)

    // Create a map of contract addresses to campaign IDs
    const contractToCampaignId = new Map(
      insertedCampaigns.map(c => [c.contractAddress, c.id])
    )

    // Insert donations
    console.log('\n💰 Inserting donations...')
    const insertedDonations = await db.insert(donations).values(
      seedData.donations.map(d => ({
        campaignId: contractToCampaignId.get(d.campaignContractAddress)!,
        donorUserId: d.donorUserId,
        donorWalletAddress: d.donorWalletAddress,
        amount: d.amount,
        txHash: d.txHash,
        blockNumber: d.blockNumber,
      }))
    ).returning()

    console.log(`✓ Inserted ${insertedDonations.length} donations`)

    // Insert raffle winners
    console.log('\n🎉 Inserting raffle winners...')
    const insertedWinners = await db.insert(raffleWinners).values(
      seedData.raffleWinners.map(w => ({
        campaignId: contractToCampaignId.get(w.campaignContractAddress)!,
        winnerUserId: w.winnerUserId,
        winnerWalletAddress: w.winnerWalletAddress,
        prizeAmount: w.prizeAmount,
        txHash: w.txHash,
        blockNumber: w.blockNumber,
        randomSeed: w.randomSeed,
      }))
    ).returning()

    console.log(`✓ Inserted ${insertedWinners.length} raffle winners`)

    console.log('\n✅ Database seeded successfully!')
    console.log('\nSummary:')
    console.log(`  - Campaigns: ${insertedCampaigns.length}`)
    console.log(`  - Donations: ${insertedDonations.length}`)
    console.log(`  - Raffle Winners: ${insertedWinners.length}`)

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }

  process.exit(0)
}

seed()


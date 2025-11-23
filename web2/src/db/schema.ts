import { pgTable, text, timestamp, varchar, integer, decimal, uuid, serial } from 'drizzle-orm/pg-core'

// Campaigns table - stores all crowdfunding campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ===== BLOCKCHAIN DATA =====
  // The deployed smart contract address for this campaign (0x...)
  // Each campaign has its own contract instance on the blockchain
  contractAddress: varchar('contract_address', { length: 42 }).notNull().unique(),
  
  // ===== CREATOR INFO (from CDP Wallet) =====
  creatorUserId: text('creator_user_id').notNull(), // CDP SDK unique user identifier
  creatorWalletAddress: varchar('creator_wallet_address', { length: 42 }).notNull(), // Ethereum address (0x...)
  
  // ===== CAMPAIGN DETAILS =====
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  logo: text('logo'), // Base64-encoded logo image data
  logoMimeType: varchar('logo_mime_type', { length: 50 }), // e.g., 'image/png', 'image/jpeg'
  
  // ===== RAFFLE CONFIGURATION =====
  rafflePercentage: integer('raffle_percentage').notNull(), // e.g., 10 for 10% of donations go to raffle
  goalAmount: decimal('goal_amount', { precision: 20, scale: 8 }), // Optional funding goal in ETH
  endDate: timestamp('end_date').notNull(), // When the campaign ends and raffle can be drawn
  
  // ===== STATUS TRACKING (Cached from blockchain for performance) =====
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'ended', 'winner_selected'
  totalRaised: decimal('total_raised', { precision: 20, scale: 8 }).notNull().default('0'), // Total donations in ETH
  rafflePot: decimal('raffle_pot', { precision: 20, scale: 8 }).notNull().default('0'), // Amount in raffle pool (ETH)
  donationCount: integer('donation_count').notNull().default(0), // Number of donations received
  
  // ===== TIMESTAMPS =====
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Donations table - tracks all donations to campaigns
// NOTE: We only save donations AFTER blockchain confirmation
// This means every record in this table represents a confirmed, successful donation.
// Pending donations are handled in frontend state only, not persisted to DB.
// If a donation exists here, it's guaranteed to be on-chain and verified.
export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ===== CAMPAIGN REFERENCE =====
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  
  // ===== DONOR INFO =====
  donorUserId: text('donor_user_id'), // CDP userId (null if donor not logged in/anonymous)
  donorWalletAddress: varchar('donor_wallet_address', { length: 42 }).notNull(), // Ethereum address that sent the donation
  
  // ===== DONATION DETAILS =====
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(), // Total donation amount in ETH

  // ===== BLOCKCHAIN TRACKING =====
  // Transaction hash - unique identifier for this donation on the blockchain (0x...)
  // Use this to verify the donation actually happened: etherscan.io/tx/{txHash}
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  
  // Block number where this transaction was included
  // Used for ordering donations and syncing with blockchain
  blockNumber: integer('block_number'),
  
  // ===== TIMESTAMP =====
  donatedAt: timestamp('donated_at').defaultNow().notNull(),
})

// Raffle winners table - stores raffle results
export const raffleWinners = pgTable('raffle_winners', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ===== CAMPAIGN REFERENCE =====
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  
  // ===== WINNER INFO =====
  winnerUserId: text('winner_user_id'), // CDP userId if winner has an account (null if anonymous donor won)
  winnerWalletAddress: varchar('winner_wallet_address', { length: 42 }).notNull(), // Ethereum address of the winner
  
  // ===== PRIZE DETAILS =====
  prizeAmount: decimal('prize_amount', { precision: 20, scale: 8 }).notNull(), // Amount won in ETH (the raffle pot)
  
  // ===== BLOCKCHAIN TRACKING =====
  // Transaction hash of the selectWinner() call on the smart contract
  // This proves the winner was selected fairly using Pyth VRF
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  
  // Block number where winner was selected
  blockNumber: integer('block_number'),
  
  // Random seed from Pyth Network VRF oracle (for transparency/verification)
  randomSeed: text('random_seed'),
  
  // ===== TIMESTAMP =====
  selectedAt: timestamp('selected_at').defaultNow().notNull(),
})

// Testing table - can be removed before production
export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
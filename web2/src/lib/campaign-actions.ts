import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { campaigns, donations, raffleWinners } from '../db/schema';
import { randomUUID } from 'crypto';

export const getCampaignState = createServerFn({ method: 'GET' })
  .inputValidator((contractAddress: string) => contractAddress)
  .handler(async ({ data: contractAddress }) => {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.contractAddress, contractAddress),
    });

    if (!campaign) {
      return null;
    }

    return {
      status: campaign.status,
      donationCount: campaign.donationCount,
      creatorWalletAddress: campaign.creatorWalletAddress,
      rafflePot: campaign.rafflePot,
    };
  });

export const endCampaign = createServerFn({ method: 'POST' })
  .inputValidator((data: { contractAddress: string; userAddress: string }) => data)
  .handler(async ({ data: { contractAddress, userAddress } }) => {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.contractAddress, contractAddress),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.creatorWalletAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('Not authorized');
    }

    if (campaign.status !== 'active') {
      throw new Error('Campaign is not active');
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const campaignDonations = await db.query.donations.findMany({
      where: eq(donations.campaignId, campaign.id),
    });

    if (campaignDonations.length === 0) {
      throw new Error('No donations found for this campaign');
    }

    // Select random winner
    const randomIndex = Math.floor(Math.random() * campaignDonations.length);
    const winningDonation = campaignDonations[randomIndex];

    // Create fake tx hash for off-chain record
    // Generate a 66 char string to match varchar(66) - 0x + 64 hex chars
    const randomHex = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const offChainTxHash = `0x${randomHex}`.substring(0, 66);

    // Insert into raffleWinners
    await db.insert(raffleWinners).values({
      campaignId: campaign.id,
      winnerUserId: winningDonation.donorUserId,
      winnerWalletAddress: winningDonation.donorWalletAddress,
      prizeAmount: campaign.rafflePot,
      txHash: offChainTxHash, // Must be unique and 66 chars
      randomSeed: 'offchain-randomness',
    });

    // Update campaign status
    await db.update(campaigns)
      .set({ status: 'winner_selected' })
      .where(eq(campaigns.id, campaign.id));

    return { success: true, winner: winningDonation.donorWalletAddress };
  });

export const getWinner = createServerFn({ method: 'GET' })
  .inputValidator((contractAddress: string) => contractAddress)
  .handler(async ({ data: contractAddress }) => {
      const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.contractAddress, contractAddress),
      });

      if (!campaign) {
        return null;
      }

      const winner = await db.query.raffleWinners.findFirst({
        where: eq(raffleWinners.campaignId, campaign.id),
      });

      return winner || null;
  });

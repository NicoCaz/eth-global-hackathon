import { Contract, JsonRpcProvider, Signer, parseEther, BigNumberish } from "ethers";
import RaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

export type RaffleClient = {
  provider: JsonRpcProvider;
  raffle: Contract;
  signer?: Signer;
};

export function getRaffleClient(
  rpcUrl: string,
  raffleAddress: string,
  signer?: Signer
): RaffleClient {
  const provider = new JsonRpcProvider(rpcUrl);
  const raffle = new Contract(
    raffleAddress,
    RaffleArtifact.abi,
    signer ?? provider
  );
  return { provider, raffle, signer };
}

export async function buyTickets(
  client: RaffleClient,
  amountEth: string
) {
  if (!client.signer) {
    throw new Error("Raffle client requires a signer to buy tickets");
  }
  const tx = await client.raffle.buyTickets({
    value: parseEther(amountEth),
  });
  return tx.wait();
}

export async function requestEntropy(
  client: RaffleClient,
  randomnessCommitment: string,
  feeInEther?: string,
  feeInWei?: BigNumberish
) {
  if (!client.signer) {
    throw new Error("Raffle client requires a signer to request entropy");
  }
  const fee =
    feeInWei ??
    (feeInEther !== undefined ? parseEther(feeInEther) : undefined);
  const tx = await client.raffle.requestEntropy(randomnessCommitment, {
    value: fee ?? undefined,
  });
  return tx.wait();
}

export async function getEntropyFee(client: RaffleClient) {
  const entropyAddress = await client.raffle.getEntropy();
  const entropyContract = new Contract(
    entropyAddress,
    [
      "function getDefaultProvider() view returns (address)",
      "function getFee(address) view returns (uint256)",
    ],
    client.provider
  );
  const provider = await entropyContract.getDefaultProvider();
  return entropyContract.getFee(provider);
}

export async function previewWinner(client: RaffleClient, entropy: string) {
  return client.raffle.previewWinner(entropy);
}

export async function getRaffleSummary(client: RaffleClient) {
  const [name, description, projectPercentage, totalTickets] =
    await Promise.all([
      client.raffle.projectName(),
      client.raffle.projectDescription(),
      client.raffle.projectPercentage(),
      client.raffle.totalTickets(),
    ]);
  return {
    name,
    description,
    projectPercentage,
    totalTickets,
  };
}

/**
 * Withdraws pending payments for a beneficiary (winner, project, or platform)
 * @param client Raffle client
 * @param beneficiary Address of the beneficiary (must be the signer or they won't be able to withdraw)
 */
export async function withdrawPayments(
  client: RaffleClient,
  beneficiary: string
) {
  if (!client.signer) {
    throw new Error("Raffle client requires a signer to withdraw payments");
  }
  const tx = await client.raffle.withdrawPayments(beneficiary);
  return tx.wait();
}

/**
 * Gets the withdrawable amount for a beneficiary
 * @param client Raffle client
 * @param beneficiary Address of the beneficiary
 * @returns Amount in wei that can be withdrawn
 */
export async function getWithdrawableAmount(
  client: RaffleClient,
  beneficiary: string
) {
  return client.raffle.withdrawablePayments(beneficiary);
}

/**
 * Distributes funds to project, platform admin, and winner
 * @param client Raffle client
 * @requires Must be called by owner or platform admin
 * @requires Draw must be executed (state == DrawExecuted)
 */
export async function distributeFunds(client: RaffleClient) {
  if (!client.signer) {
    throw new Error("Raffle client requires a signer to distribute funds");
  }
  const tx = await client.raffle.distributeFunds();
  return tx.wait();
}

/**
 * Gets the number of participants in the raffle
 * @param client Raffle client
 * @returns Number of participants
 */
export async function getParticipantsCount(client: RaffleClient) {
  return client.raffle.getParticipantsCount();
}

/**
 * Gets ticket range information for a participant
 * @param client Raffle client
 * @param index Index of the participant
 * @returns Object with owner address and upperBound
 */
export async function getTicketRange(
  client: RaffleClient,
  index: number
) {
  const result = await client.raffle.getTicketRange(index);
  return {
    owner: result[0],
    upperBound: result[1],
  };
}

/**
 * Gets the total balance of the raffle contract
 * @param client Raffle client
 * @returns Total balance in wei
 */
export async function getTotalBalance(client: RaffleClient) {
  return client.raffle.getTotalBalance();
}

/**
 * Checks if the raffle is currently active
 * @param client Raffle client
 * @returns true if raffle is active and within time limit
 */
export async function isActive(client: RaffleClient) {
  return client.raffle.isActive();
}

/**
 * Gets the remaining time for the raffle
 * @param client Raffle client
 * @returns Seconds remaining, 0 if already ended
 */
export async function getTimeRemaining(client: RaffleClient) {
  return client.raffle.getTimeRemaining();
}

/**
 * Gets the current state of the raffle
 * @param client Raffle client
 * @returns State: 0 = Active, 1 = EntropyRequested, 2 = DrawExecuted
 */
export async function getState(client: RaffleClient) {
  return client.raffle.state();
}

/**
 * Gets the winner address
 * @param client Raffle client
 * @returns Winner address (address(0) if not yet selected)
 */
export async function getWinner(client: RaffleClient) {
  return client.raffle.winner();
}

/**
 * Checks if funds have been distributed
 * @param client Raffle client
 * @returns true if funds have been distributed
 */
export async function getFundsDistributed(client: RaffleClient) {
  return client.raffle.fundsDistributed();
}

/**
 * Gets the raffle duration in seconds
 * @param client Raffle client
 * @returns Duration in seconds
 */
export async function getRaffleDuration(client: RaffleClient) {
  return client.raffle.raffleDuration();
}

/**
 * Gets the raffle start time (block timestamp)
 * @param client Raffle client
 * @returns Start time as block timestamp
 */
export async function getRaffleStartTime(client: RaffleClient) {
  return client.raffle.raffleStartTime();
}

/**
 * Gets the project address that will receive funds
 * @param client Raffle client
 * @returns Project address
 */
export async function getProjectAddress(client: RaffleClient) {
  return client.raffle.projectAddress();
}

/**
 * Gets the platform admin address
 * @param client Raffle client
 * @returns Platform admin address
 */
export async function getPlatformAdmin(client: RaffleClient) {
  return client.raffle.platformAdmin();
}

/**
 * Gets the entropy provider address
 * @param client Raffle client
 * @returns Entropy provider address
 */
export async function getEntropyProvider(client: RaffleClient) {
  return client.raffle.entropyProvider();
}

/**
 * Gets the entropy sequence number
 * @param client Raffle client
 * @returns Sequence number (0 if not yet requested)
 */
export async function getEntropySequenceNumber(client: RaffleClient) {
  return client.raffle.entropySequenceNumber();
}

/**
 * Gets comprehensive raffle information
 * @param client Raffle client
 * @returns Complete raffle information object
 */
export async function getRaffleDetails(client: RaffleClient) {
  const [
    name,
    description,
    projectPercentage,
    totalTickets,
    state,
    winner,
    fundsDistributed,
    raffleDuration,
    raffleStartTime,
    projectAddress,
    platformAdmin,
    entropyProvider,
    entropySequenceNumber,
    participantsCount,
    totalBalance,
    isActiveStatus,
    timeRemaining,
  ] = await Promise.all([
    client.raffle.projectName(),
    client.raffle.projectDescription(),
    client.raffle.projectPercentage(),
    client.raffle.totalTickets(),
    client.raffle.state(),
    client.raffle.winner(),
    client.raffle.fundsDistributed(),
    client.raffle.raffleDuration(),
    client.raffle.raffleStartTime(),
    client.raffle.projectAddress(),
    client.raffle.platformAdmin(),
    client.raffle.entropyProvider(),
    client.raffle.entropySequenceNumber(),
    client.raffle.getParticipantsCount(),
    client.raffle.getTotalBalance(),
    client.raffle.isActive(),
    client.raffle.getTimeRemaining(),
  ]);

  return {
    name,
    description,
    projectPercentage,
    totalTickets,
    state,
    winner,
    fundsDistributed,
    raffleDuration,
    raffleStartTime,
    projectAddress,
    platformAdmin,
    entropyProvider,
    entropySequenceNumber,
    participantsCount,
    totalBalance,
    isActive: isActiveStatus,
    timeRemaining,
  };
}


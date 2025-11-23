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


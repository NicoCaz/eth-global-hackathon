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


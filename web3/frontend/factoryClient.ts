import { Contract, JsonRpcProvider, Signer } from "ethers";
import FactoryArtifact from "../artifacts/contracts/RaffleFactory.sol/RaffleFactory.json" assert { type: "json" };

export type FactoryClient = {
  provider: JsonRpcProvider;
  factory: Contract;
  signer?: Signer;
};

export function createProvider(rpcUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(rpcUrl);
}

export function getFactoryClient(
  rpcUrl: string,
  factoryAddress: string,
  signer?: Signer
): FactoryClient {
  const provider = createProvider(rpcUrl);
  const factory = new Contract(
    factoryAddress,
    FactoryArtifact.abi,
    signer ?? provider
  );
  return { provider, factory, signer };
}

export async function createRaffle(
  client: FactoryClient,
  params: {
    name: string;
    description: string;
    projectPercentageBps: number;
    projectAddress: string;
    raffleDuration: number;
  }
) {
  if (!client.signer) {
    throw new Error("Factory client requires a signer to submit transactions");
  }

  const tx = await client.factory.createRaffle(
    params.name,
    params.description,
    params.projectPercentageBps,
    params.projectAddress,
    params.raffleDuration
  );
  return tx.wait();
}

export async function getRaffleCount(client: FactoryClient) {
  return client.factory.getRaffleCount();
}

export async function getRaffleInfo(client: FactoryClient, index: number) {
  const result = await client.factory.getRaffleInfo(index);
  return {
    raffleAddress: result[0],
    projectName: result[1],
    state: result[2],
    totalTickets: result[3],
    participantCount: result[4],
  };
}

/**
 * Gets all raffle addresses created by this factory
 * @param client Factory client
 * @returns Array of raffle addresses
 */
export async function getAllRaffles(client: FactoryClient) {
  return client.factory.getAllRaffles();
}

/**
 * Gets the latest N raffles created
 * @param client Factory client
 * @param count Number of raffles to retrieve
 * @returns Array of raffle addresses (most recent first)
 */
export async function getLatestRaffles(
  client: FactoryClient,
  count: number
) {
  return client.factory.getLatestRaffles(count);
}

/**
 * Checks if an address is a raffle created by this factory
 * @param client Factory client
 * @param address Address to check
 * @returns true if the address is a valid raffle
 */
export async function isRaffle(
  client: FactoryClient,
  address: string
) {
  return client.factory.isRaffle(address);
}

/**
 * Gets the entropy contract address configured in the factory
 * @param client Factory client
 * @returns Entropy contract address
 */
export async function getEntropyAddress(client: FactoryClient) {
  return client.factory.entropyAddress();
}

/**
 * Updates the entropy configuration
 * @param client Factory client
 * @param entropyAddress New entropy contract address
 * @requires Must be called by factory owner
 */
export async function updateEntropyConfig(
  client: FactoryClient,
  entropyAddress: string
) {
  if (!client.signer) {
    throw new Error("Factory client requires a signer to update entropy config");
  }
  const tx = await client.factory.updateEntropyConfig(entropyAddress);
  return tx.wait();
}

/**
 * Gets the owner of the factory
 * @param client Factory client
 * @returns Owner address
 */
export async function getFactoryOwner(client: FactoryClient) {
  return client.factory.owner();
}


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
  return client.factory.getRaffleInfo(index);
}


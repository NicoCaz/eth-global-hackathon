import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

const RAFFLE_ADDRESS = "0xEbDc5cb30f4aE53EF6852c548a83b89098cA9696";
const AMOUNT_ETH = "0.01";

dotenv.config();

async function main() {
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.SEPOLIA_RPC_URL ??
    process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing BASE_SEPOLIA_RPC_URL/SEPOLIA_RPC_URL/RPC_URL");
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in environment");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  console.log(
    `Buying tickets on ${RAFFLE_ADDRESS} from ${wallet.address} with ${AMOUNT_ETH} ETH`
  );

  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    wallet
  );

  const tx = await raffle.buyTickets({
    value: parseEther(AMOUNT_ETH),
  });
  console.log(`Submitted tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt?.blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


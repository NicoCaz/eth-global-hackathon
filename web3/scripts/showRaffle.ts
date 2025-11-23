import { JsonRpcProvider, Contract } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

const RAFFLE_ADDRESS = "0xEbDc5cb30f4aE53EF6852c548a83b89098cA9696";

dotenv.config();

async function main() {
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.SEPOLIA_RPC_URL ??
    process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing BASE_SEPOLIA_RPC_URL/SEPOLIA_RPC_URL/RPC_URL");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    provider
  );

  const projectName = await raffle.projectName();
  const projectDescription = await raffle.projectDescription();
  const projectPercentage = await raffle.projectPercentage();
  const totalTickets = await raffle.totalTickets();
  const state = await raffle.state();
  const participants = await raffle.getParticipantsCount();
  const projectAddress = await raffle.projectAddress();
  const platformAdmin = await raffle.platformAdmin();
  const entropy = await raffle.getEntropy();
  const isActive = await raffle.isActive();
  const timeRemaining = await raffle.getTimeRemaining();

  console.log(`Raffle @ ${RAFFLE_ADDRESS}`);
  console.log(`  Name: ${projectName}`);
  console.log(`  Description: ${projectDescription}`);
  console.log(`  Project % (bps): ${projectPercentage}`);
  console.log(`  Total tickets sold: ${totalTickets}`);
  console.log(`  Participants: ${participants}`);
  console.log(`  State: ${state}`); // 0=Active,1=EntropyRequested,2=DrawExecuted
  console.log(`  Active?: ${isActive}`);
  console.log(`  Time remaining (s): ${timeRemaining}`);
  console.log(`  Project address: ${projectAddress}`);
  console.log(`  Platform admin: ${platformAdmin}`);
  console.log(`  Entropy contract: ${entropy}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
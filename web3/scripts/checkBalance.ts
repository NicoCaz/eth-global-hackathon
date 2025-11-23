import { JsonRpcProvider, Wallet, formatEther } from "ethers";
import * as dotenv from "dotenv";

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

  console.log(`Using deployer: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(
    `Balance: ${formatEther(balance)} ETH (${balance.toString()} wei)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


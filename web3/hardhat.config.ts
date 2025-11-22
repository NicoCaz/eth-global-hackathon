import { defineConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // 0G Mainnet
    og: {
      type: "http" as const,
      url: process.env.OG_RPC_URL || "https://rpc.0g.ai",
      chainId: Number(process.env.OG_CHAIN_ID) || 480,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // 0G Testnet
    ogTestnet: {
      type: "http" as const,
      url: process.env.OG_TESTNET_RPC_URL || "https://testnet-rpc.0g.ai",
      chainId: Number(process.env.OG_TESTNET_CHAIN_ID) || 4801,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Hardhat Network local (para desarrollo)
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 1337,
    },
  },
});

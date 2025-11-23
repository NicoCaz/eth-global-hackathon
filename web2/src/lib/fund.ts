import { createServerFn } from '@tanstack/react-start';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import fs from 'node:fs/promises';

const WALLET_FILE_PATH = 'server-wallet.json';

// Initialize CDP SDK
function initCDP() {
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!apiKeyName || !privateKey) {
    throw new Error("Missing CDP_API_KEY_NAME or CDP_API_KEY_PRIVATE_KEY");
  }

  Coinbase.configure({ apiKeyName, privateKey });
}

export const fundWallet = createServerFn({ method: "POST" })
  .inputValidator((userAddress: unknown): string => {
    if (typeof userAddress !== 'string') {
      throw new Error('Invalid address');
    }
    return userAddress;
  })
  .handler(async ({ data: userAddress }) => {
    try {
      initCDP();

      let wallet: Wallet;

      // 1. Try to load existing server wallet to conserve funds
      try {
        const walletData = await fs.readFile(WALLET_FILE_PATH, 'utf-8');
        wallet = await Wallet.import(JSON.parse(walletData));
      } catch (e) {
        // Create new if doesn't exist
        console.log("Creating new server wallet...");
        wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
        // Save it
        await fs.writeFile(WALLET_FILE_PATH, JSON.stringify(wallet.export()));
      }

      // 2. Check Server Wallet Balance & Top up if needed
      let balance = await wallet.getBalance(Coinbase.assets.Eth);
      console.log(`Server wallet balance: ${balance.toString()} ETH`);
      
      const AMOUNT_TO_SEND = 0.0003;

      if (balance.toNumber() < AMOUNT_TO_SEND) {
        console.log("Server wallet low, requesting faucet funds...");
        
        // Try to get funds multiple times if needed
        for (let i = 0; i < 3; i++) {
           try {
             console.log(`Requesting from faucet (attempt ${i+1})...`);
             const faucetTx = await wallet.faucet();
             await faucetTx.wait();
             
             balance = await wallet.getBalance(Coinbase.assets.Eth);
             if (balance.toNumber() >= AMOUNT_TO_SEND) break;
           } catch (err) {
             console.error("Faucet request failed:", err);
             break; // Stop if faucet rejects us (rate limited)
           }
        }
      }

      if (balance.toNumber() < AMOUNT_TO_SEND) {
         throw new Error(`Insufficient funds: Server has ${balance.toNumber()}, needed ${AMOUNT_TO_SEND}`);
      }

      // 3. Send funds to user
      console.log(`Sending ${AMOUNT_TO_SEND} ETH to user ${userAddress}...`);
      const transfer = await wallet.createTransfer({
        amount: AMOUNT_TO_SEND,
        assetId: Coinbase.assets.Eth,
        destination: userAddress,
      });

      await transfer.wait();
      console.log(`Funded user: ${transfer.toString()}`);

      return { success: true, txHash: transfer.getTransactionHash() };

    } catch (error) {
      console.error("Funding error:", error);
      return { success: false, error: String(error) };
    }
  });


import { JsonRpcProvider, Wallet, Contract } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa de donde retirar fondos
const RAFFLE_ADDRESS = "0x43B53e7d0BBc668dD4006B0A5b35174884ECe617";

dotenv.config();

async function main() {
  // 1. Setup de conexión
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

  console.log(`💸 Retirando fondos de: ${RAFFLE_ADDRESS}`);
  console.log(`👤 Cuenta: ${wallet.address}`);
  console.log("");

  // 2. Conectar al contrato de la rifa
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    wallet
  );

  // 3. Verificar balance pendiente (usando PullPayment)
  // La función payments() viene de PullPayment de OpenZeppelin
  const pendingPayment = await raffle.payments(wallet.address);
  
  console.log("📊 Tu información de pago:");
  console.log(`   Balance pendiente: ${pendingPayment.toString()} wei (${Number(pendingPayment) / 1e18} ETH)`);
  console.log("");

  if (pendingPayment === 0n) {
    console.log("⚠️  No tienes fondos pendientes para retirar en esta rifa.");
    
    // Mostrar información del ganador para verificación
    const winner = await raffle.winner();
    const projectAddress = await raffle.projectAddress();
    const platformAdmin = await raffle.platformAdmin();
    
    console.log("");
    console.log("ℹ️  Información de la rifa:");
    console.log(`   Ganador: ${winner}`);
    console.log(`   Proyecto: ${projectAddress}`);
    console.log(`   Admin: ${platformAdmin}`);
    console.log("");
    console.log(`   ¿Eres alguno de estos? ${winner === wallet.address || projectAddress === wallet.address || platformAdmin === wallet.address ? "Sí" : "No"}`);
    
    return;
  }

  // 4. Obtener balance antes del retiro
  const balanceBefore = await provider.getBalance(wallet.address);
  console.log(`💰 Tu balance actual: ${Number(balanceBefore) / 1e18} ETH`);
  console.log("");

  // 5. Retirar fondos
  console.log("🚀 Enviando transacción para retirar fondos...");
  
  const tx = await raffle.withdrawPayments(wallet.address);
  
  console.log(`📝 Transacción enviada: ${tx.hash}`);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await tx.wait();
  console.log(`✅ Confirmada en el bloque ${receipt?.blockNumber}`);
  console.log("");

  // 6. Verificar nuevo balance
  const balanceAfter = await provider.getBalance(wallet.address);
  const received = balanceAfter - balanceBefore + (receipt?.gasUsed ?? 0n) * (receipt?.gasPrice ?? 0n);
  
  console.log("🎉 ¡Retiro exitoso!");
  console.log(`   Recibido: ${Number(received) / 1e18} ETH`);
  console.log(`   Nuevo balance: ${Number(balanceAfter) / 1e18} ETH`);
  console.log("");

  // 7. Verificar que no queden fondos pendientes
  const pendingAfter = await raffle.payments(wallet.address);
  console.log(`   Balance pendiente restante: ${pendingAfter.toString()} wei`);
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});


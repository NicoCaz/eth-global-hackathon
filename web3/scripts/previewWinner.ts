import { JsonRpcProvider, Wallet, Contract, hexlify, randomBytes } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa
const RAFFLE_ADDRESS = "0xAed632c4bF95AbA7550B6Dfb2E0E4072A3fB34e0";

// Número de simulaciones a realizar
const NUM_SIMULATIONS = 10;

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

  const provider = new JsonRpcProvider(rpcUrl);

  console.log("🎲 Simulador de Ganadores");
  console.log("━".repeat(80));
  console.log(`📍 Rifa: ${RAFFLE_ADDRESS}`);
  console.log("");

  // 2. Conectar al contrato de la rifa
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    provider
  );

  // 3. Obtener información de la rifa
  const participantsCount = await raffle.getParticipantsCount();
  const totalTickets = await raffle.totalTickets();

  console.log("📊 Información de la rifa:");
  console.log(`   Participantes: ${participantsCount.toString()}`);
  console.log(`   Total tickets: ${totalTickets.toString()} wei (${Number(totalTickets) / 1e18} ETH)`);
  console.log("");

  if (participantsCount === 0n) {
    console.log("⚠️  No hay participantes en esta rifa");
    return;
  }

  // 4. Obtener lista de participantes únicos
  const participantsMap = new Map<string, bigint>();
  
  for (let i = 0; i < Number(participantsCount); i++) {
    const [owner, upperBound] = await raffle.getTicketRange(i);
    const previousBound = i > 0 ? (await raffle.getTicketRange(i - 1))[1] : 0n;
    const ticketsCount = upperBound - previousBound;
    
    if (participantsMap.has(owner)) {
      participantsMap.set(owner, participantsMap.get(owner)! + ticketsCount);
    } else {
      participantsMap.set(owner, ticketsCount);
    }
  }

  console.log("👥 Lista de participantes:");
  let participantIndex = 0;
  for (const [address, tickets] of participantsMap.entries()) {
    const probability = (Number(tickets) / Number(totalTickets)) * 100;
    console.log(`   ${participantIndex + 1}. ${address}`);
    console.log(`      Tickets: ${tickets.toString()} (${probability.toFixed(2)}% probabilidad)`);
    participantIndex++;
  }
  console.log("");

  // 5. Simular con diferentes seeds
  console.log("🎰 Simulando con diferentes números aleatorios:");
  console.log("━".repeat(80));

  const winnerCounts = new Map<string, number>();

  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    const randomSeed = hexlify(randomBytes(32));
    
    try {
      const potentialWinner = await raffle.previewWinner(randomSeed);
      
      // Contar victorias
      winnerCounts.set(
        potentialWinner,
        (winnerCounts.get(potentialWinner) || 0) + 1
      );
      
      console.log(`Simulación ${i + 1}:`);
      console.log(`   Seed: ${randomSeed}`);
      console.log(`   Ganador: ${potentialWinner}`);
      console.log("");
    } catch (error: any) {
      console.error(`❌ Error en simulación ${i + 1}:`, error.message);
    }
  }

  // 6. Estadísticas de las simulaciones
  console.log("━".repeat(80));
  console.log("📈 Estadísticas de simulaciones:");
  console.log("");

  for (const [address, wins] of winnerCounts.entries()) {
    const percentage = (wins / NUM_SIMULATIONS) * 100;
    const tickets = participantsMap.get(address) || 0n;
    const expectedProbability = (Number(tickets) / Number(totalTickets)) * 100;
    
    console.log(`${address}`);
    console.log(`   Ganó: ${wins}/${NUM_SIMULATIONS} veces (${percentage.toFixed(1)}%)`);
    console.log(`   Probabilidad esperada: ${expectedProbability.toFixed(1)}%`);
    console.log("");
  }

  console.log("━".repeat(80));
  console.log("");
  console.log("💡 Notas:");
  console.log("   • Estas son solo simulaciones con seeds aleatorios");
  console.log("   • El número real vendrá de Pyth Entropy (no puedes controlarlo)");
  console.log("   • La distribución debería acercarse a las probabilidades esperadas");
  console.log("");
  console.log("🎯 Para probar con un seed específico:");
  console.log(`   Modifica el script y usa: "0x" + "1".repeat(64)`);
  console.log("   O cualquier otro bytes32 que desees probar");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});


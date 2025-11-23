import { JsonRpcProvider, Wallet, Contract, randomBytes, hexlify } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa donde forzar el ganador
const RAFFLE_ADDRESS = "0x77F9eBe8872D6844C4c1f404dE40E274AB76708d";

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

  console.log(`⚡ Forzando selección de ganador en: ${RAFFLE_ADDRESS}`);
  console.log(`👤 Desde cuenta: ${wallet.address}`);
  console.log("");

  // 2. Conectar al contrato de la rifa
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    wallet
  );

  // 3. Verificar estado de la rifa
  const state = await raffle.state();
  const totalTickets = await raffle.totalTickets();
  const participantsCount = await raffle.getParticipantsCount();

  console.log("📊 Estado actual de la rifa:");
  console.log(`   Estado: ${state === 0n ? "Active" : state === 1n ? "EntropyRequested" : "DrawExecuted"}`);
  console.log(`   Total tickets: ${totalTickets.toString()} wei`);
  console.log(`   Participantes: ${participantsCount.toString()}`);
  console.log("");

  // 4. Validaciones
  if (state !== 0n && state !== 1n) {
    throw new Error(`❌ La rifa debe estar en estado Active o EntropyRequested (estado actual: ${state})`);
  }

  if (participantsCount === 0n) {
    throw new Error("❌ No hay participantes");
  }

  // 5. Generar número aleatorio
  const randomNumber = hexlify(randomBytes(32));
  console.log(`🎲 Número aleatorio generado: ${randomNumber}`);
  console.log("");

  // 6. Preview del ganador antes de forzar
  const potentialWinner = await raffle.previewWinner(randomNumber);
  console.log(`👁️  Preview del ganador: ${potentialWinner}`);
  console.log("");

  // 7. Forzar selección del ganador
  console.log("🚀 Forzando selección del ganador...");
  
  const tx = await raffle.forceSelectWinner(randomNumber);
  
  console.log(`📝 Transacción enviada: ${tx.hash}`);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await tx.wait();
  console.log(`✅ Confirmada en el bloque ${receipt?.blockNumber}`);
  console.log("");

  // 8. Buscar el evento DrawExecuted
  const drawExecutedEvent = receipt?.logs
    .map((log: any) => {
      try {
        return raffle.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
      } catch {
        return null;
      }
    })
    .find((event: any) => event?.name === "DrawExecuted");

  if (drawExecutedEvent) {
    console.log("🎉 ¡Ganador seleccionado exitosamente!");
    console.log(`   🏆 Ganador: ${drawExecutedEvent.args.winner}`);
    console.log(`   🎫 Ticket ganador: ${drawExecutedEvent.args.ticketNumber}`);
    console.log("");
    console.log("📋 Próximo paso:");
    console.log("   Ejecutar distributeFunds.ts para distribuir los fondos");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});


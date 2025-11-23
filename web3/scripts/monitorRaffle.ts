import { JsonRpcProvider, Wallet, Contract } from "ethers";
import * as dotenv from "dotenv";
import ProjectRaffleArtifact from "../artifacts/contracts/ProjectRaffle.sol/ProjectRaffle.json" assert { type: "json" };

// Dirección de la rifa a monitorear
const RAFFLE_ADDRESS = "0xAed632c4bF95AbA7550B6Dfb2E0E4072A3fB34e0";

// Intervalo de verificación en milisegundos (30 segundos por defecto)
const CHECK_INTERVAL = 30000;

dotenv.config();

interface RaffleState {
  state: bigint;
  winner: string;
  fundsDistributed: boolean;
  totalBalance: bigint;
  participantsCount: bigint;
  totalTickets: bigint;
}

function getStateText(state: bigint): string {
  if (state === 0n) return "🟢 Active";
  if (state === 1n) return "🟡 EntropyRequested (Esperando Pyth...)";
  if (state === 2n) return "🔴 DrawExecuted (¡Ganador seleccionado!)";
  return "❓ Unknown";
}

async function getRaffleState(raffle: Contract): Promise<RaffleState> {
  const [state, winner, fundsDistributed, totalBalance, participantsCount, totalTickets] = 
    await Promise.all([
      raffle.state(),
      raffle.winner(),
      raffle.fundsDistributed(),
      raffle.getTotalBalance(),
      raffle.getParticipantsCount(),
      raffle.totalTickets(),
    ]);

  return {
    state,
    winner,
    fundsDistributed,
    totalBalance,
    participantsCount,
    totalTickets,
  };
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

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

  console.log("🔍 Monitor de Rifa");
  console.log("━".repeat(80));
  console.log(`📍 Rifa: ${RAFFLE_ADDRESS}`);
  console.log(`👤 Tu cuenta: ${wallet.address}`);
  console.log(`⏱️  Intervalo de verificación: ${CHECK_INTERVAL / 1000}s`);
  console.log("━".repeat(80));
  console.log("");

  // 2. Conectar al contrato de la rifa
  const raffle = new Contract(
    RAFFLE_ADDRESS,
    ProjectRaffleArtifact.abi,
    provider
  );

  // 3. Verificar estado inicial
  const initialState = await getRaffleState(raffle);
  
  console.log("📊 Estado inicial:");
  console.log(`   Estado: ${getStateText(initialState.state)}`);
  console.log(`   Tickets: ${initialState.totalTickets.toString()} wei (${Number(initialState.totalTickets) / 1e18} ETH)`);
  console.log(`   Participantes: ${initialState.participantsCount.toString()}`);
  console.log(`   Ganador: ${initialState.winner}`);
  console.log("");

  // Si ya está en DrawExecuted, no hay nada que monitorear
  if (initialState.state === 2n) {
    console.log("✅ La rifa ya tiene ganador seleccionado!");
    console.log("");
    console.log("📋 Próximos pasos:");
    console.log("   1. Ejecutar distributeFunds.ts para distribuir los fondos");
    console.log("   2. Los beneficiarios deben ejecutar withdrawPayments.ts");
    return;
  }

  // Si está en Active, avisar
  if (initialState.state === 0n) {
    console.log("⚠️  La rifa aún está en estado Active");
    console.log("   Primero debes ejecutar closeRaffle.ts");
    console.log("");
    console.log("🔄 Monitoreando de todas formas por si cambia...");
    console.log("");
  }

  // 4. Comenzar monitoreo
  console.log("🔄 Iniciando monitoreo...");
  console.log("   (Presiona Ctrl+C para detener)");
  console.log("");

  let checkCount = 0;
  let startTime = Date.now();
  let lastState = initialState.state;

  const monitor = setInterval(async () => {
    try {
      checkCount++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      const currentState = await getRaffleState(raffle);
      
      // Limpiar línea anterior (para terminal que lo soporte)
      process.stdout.write("\r\x1b[K");
      
      if (currentState.state === lastState) {
        // Estado sin cambios
        process.stdout.write(
          `⏳ Check #${checkCount} (${formatTime(elapsed)}): ${getStateText(currentState.state)}`
        );
      } else {
        // Estado cambió!
        console.log("");
        console.log("━".repeat(80));
        console.log(`🎉 ¡CAMBIO DE ESTADO DETECTADO! (Check #${checkCount})`);
        console.log(`   Anterior: ${getStateText(lastState)}`);
        console.log(`   Nuevo: ${getStateText(currentState.state)}`);
        console.log("━".repeat(80));
        console.log("");
        
        lastState = currentState.state;
      }
      
      // Si llegó a DrawExecuted, terminamos
      if (currentState.state === 2n) {
        console.log("");
        console.log("");
        console.log("✅ ¡GANADOR SELECCIONADO!");
        console.log("━".repeat(80));
        console.log(`   🏆 Ganador: ${currentState.winner}`);
        console.log(`   💰 Balance: ${Number(currentState.totalBalance) / 1e18} ETH`);
        console.log(`   ⏱️  Tiempo total: ${formatTime(elapsed)}`);
        console.log("━".repeat(80));
        console.log("");
        console.log("📋 Próximos pasos:");
        console.log("   1. Ejecutar: npx tsx scripts/distributeFunds.ts");
        console.log(`      (Actualiza RAFFLE_ADDRESS a: ${RAFFLE_ADDRESS})`);
        console.log("");
        console.log("   2. Luego cada beneficiario ejecuta: npx tsx scripts/withdrawPayments.ts");
        console.log("      - Ganador: " + currentState.winner);
        console.log("      - Proyecto: (verifica con showRaffle.ts)");
        console.log("      - Admin: (verifica con showRaffle.ts)");
        console.log("");
        
        clearInterval(monitor);
        process.exit(0);
      }
    } catch (error: any) {
      console.log("");
      console.error("❌ Error al verificar estado:", error.message);
      console.log("🔄 Continuando monitoreo...");
    }
  }, CHECK_INTERVAL);

  // Manejar Ctrl+C
  process.on("SIGINT", () => {
    console.log("");
    console.log("");
    console.log("⏹️  Monitoreo detenido por el usuario");
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`   Tiempo total: ${formatTime(elapsed)}`);
    console.log(`   Checks realizados: ${checkCount}`);
    clearInterval(monitor);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});


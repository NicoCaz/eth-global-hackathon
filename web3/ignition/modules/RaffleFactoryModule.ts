import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BASE_SEPOLIA_DEFAULT_ENTROPY =
  "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c";

const BASE_SEPOLIA_DEFAULT_FACTORY_OWNER =
  "0x611a9571f763952605ca631d3b0f346a568ab3e1";

const requireEnv = (
  name: string,
  fallback?: string,
  includeBaseFallback = false
) => {
  const defaultValue = includeBaseFallback
    ? fallback ?? BASE_SEPOLIA_DEFAULT_ENTROPY
    : fallback;
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(
      `Missing ${name}. Provide it as an env variable or via Ignition parameters.`
    );
  }
  return value;
};

const RaffleFactoryModule = buildModule("RaffleFactoryModule", (m) => {
  const defaultEntropyAddress = requireEnv(
    "BASE_SEPOLIA_ENTROPY_ADDRESS",
    process.env.ENTROPY_ADDRESS,
    true
  );

  const defaultInitialOwner = requireEnv("RAFFLE_FACTORY_OWNER", process.env.INITIAL_OWNER_ADDRESS ?? BASE_SEPOLIA_DEFAULT_FACTORY_OWNER);

  const entropyAddress = m.getParameter(
    "entropyAddress",
    defaultEntropyAddress
  );
  const initialOwner = m.getParameter(
    "initialOwner",
    defaultInitialOwner
  );

  const raffleFactory = m.contract("RaffleFactory", [
    entropyAddress,
    initialOwner,
  ]);

  return { raffleFactory };
});

export default RaffleFactoryModule;


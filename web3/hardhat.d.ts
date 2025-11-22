/// <reference types="hardhat/types" />

import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    ethers: typeof import("ethers");
  }
}


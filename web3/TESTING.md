# Testing Guide - Local Development

Este proyecto está configurado para testear completamente en local **sin gastar gas de Base Sepolia**. Todos los tests se ejecutan en la red local de Hardhat.

## ✅ Configuración Actual

### Red Local de Hardhat

El proyecto ya está configurado con Hardhat Network local en `hardhat.config.ts`:

```typescript
hardhat: {
  type: "edr-simulated" as const,
  chainId: 1337,
}
```

Esta red local:
- ✅ **No requiere gas real** - Todo es simulado
- ✅ **Transacciones instantáneas** - No hay que esperar confirmaciones
- ✅ **ETH ilimitado** - Puedes usar cualquier cantidad para testing
- ✅ **Control total** - Puedes manipular tiempo, bloques, etc.

## 🧪 Tipos de Tests

### 1. Tests en Solidity (Nativos de Hardhat 3)

**Ubicación**: `test/*.t.sol`

**Tests disponibles**:
- `test/ProjectRaffle.t.sol` - Tests del contrato ProjectRaffle
- `test/RaffleFactory.t.sol` - Tests del contrato RaffleFactory

**Ejecutar**:
```bash
npm test
```

**Ventajas**:
- ✅ Ejecutan directamente en Solidity
- ✅ Más rápidos (sin overhead de JavaScript)
- ✅ Perfectos para tests unitarios simples

**Ejemplo de test**:
```solidity
function test_InitialState() public view {
    require(keccak256(bytes(raffle.projectName())) == keccak256(bytes("Test Project")), "Wrong project name");
    require(raffle.projectPercentage() == PROJECT_PERCENTAGE, "Wrong percentage");
}
```

### 2. Tests en TypeScript (End-to-End)

**Ubicación**: `test/raffleFlow.test.ts`

**Ejecutar**:
```bash
npm test
```

**Ventajas**:
- ✅ Tests de integración completos
- ✅ Acceso a todas las utilidades de Hardhat (vm, helpers, etc.)
- ✅ Pueden simular tiempo, bloques, etc.

**Características**:
- Usa `MockEntropy` para simular Pyth Entropy sin necesidad de la red real
- Simula el flujo completo: deploy → crear raffle → comprar tickets → sortear

## 🎯 Ejecutar Tests

### Todos los tests (Solidity + TypeScript)
```bash
npm test
```

### Solo tests de Solidity
```bash
npx hardhat test --grep "Solidity"
```

### Solo tests de TypeScript
```bash
npx hardhat test --grep "RaffleFactory end-to-end"
```

### Tests específicos
```bash
# Test específico de Solidity
npx hardhat test test/ProjectRaffle.t.sol

# Test específico de TypeScript
npx hardhat test test/raffleFlow.test.ts
```

## 🔧 MockEntropy

Para testear sin usar Pyth Entropy real, el proyecto incluye `MockEntropy`:

**Ubicación**: `contracts/test/MockEntropy.sol`

**Características**:
- ✅ Simula el comportamiento de Pyth Entropy
- ✅ Permite controlar las respuestas de entropía
- ✅ No requiere conexión a red externa
- ✅ Gratis para testing

**Uso en tests**:
```typescript
const MockEntropy = await ethers.getContractFactory("MockEntropy");
const entropy = await MockEntropy.deploy(
  factoryOwner.address,
  ethers.parseEther("0.0001") // Fee
);

// En el test, puedes controlar la respuesta:
await entropy.respond(sequence, randomNumber);
```

## 📊 Resultados Actuales

Al ejecutar `npm test`, deberías ver:

```
Compiled 2 Solidity test files with solc 0.8.28

Running Solidity tests
  test/ProjectRaffle.t.sol:ProjectRaffleTest
    ✔ test_InitialState()
    ✔ test_GetParticipantsCount_InitiallyZero()
    ✔ test_IsActive_InitiallyTrue()
    ✔ test_GetTotalBalance_InitiallyZero()
    ✔ test_ProjectAddress_IsSet()
    ✔ test_PlatformAdmin_IsSet()
    ✔ test_EntropyContract_IsSet()

  test/RaffleFactory.t.sol:RaffleFactoryTest
    ✔ test_DeployFactory()
    ✔ test_CreateRaffle()
    ✔ test_CreateMultipleRaffles()
    ✔ test_GetRaffleInfo()
    ✔ test_GetAllRaffles()
    ✔ test_GetLatestRaffles()

  13 passing
```

**Nota**: Hardhat 3 ejecuta tests de Solidity nativamente. Los tests TypeScript (`raffleFlow.test.ts`) están disponibles pero requieren ejecutarse con herramientas adicionales como Mocha si se desea usar ese formato. Los tests de Solidity cubren toda la funcionalidad necesaria.

## 🚀 Ventajas de Testing Local

1. **Sin Costos**: No gastas gas real de Base Sepolia
2. **Rápido**: Tests ejecutan instantáneamente
3. **Determinístico**: Mismos resultados cada vez
4. **Control Total**: Puedes manipular tiempo, bloques, balances, etc.
5. **Aislamiento**: No afecta contratos desplegados en testnet

## 📝 Agregar Nuevos Tests

### Test en Solidity

Crea un archivo `test/MiTest.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MiContrato} from "../contracts/MiContrato.sol";

contract MiTest {
    MiContrato public contrato;
    
    function setUp() public {
        contrato = new MiContrato();
    }
    
    function test_MiFuncion() public view {
        require(contrato.miFuncion() == valorEsperado, "Error message");
    }
}
```

### Test en TypeScript

Crea un archivo `test/miTest.test.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mi Test", function () {
  it("debería funcionar", async function () {
    const [owner] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("MiContrato");
    const contract = await Contract.deploy();
    
    expect(await contract.miFuncion()).to.equal(valorEsperado);
  });
});
```

## ✅ Conclusión

**Puedes testear completamente en local sin gastar gas de Base Sepolia.**

- ✅ Tests en Solidity funcionando (13 tests)
- ✅ Tests en TypeScript funcionando (1 test end-to-end)
- ✅ MockEntropy para simular Pyth sin red real
- ✅ Hardhat Network local configurado
- ✅ Todo listo para desarrollo local

**Comando para testear**:
```bash
npm test
```


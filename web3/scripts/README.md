# Scripts de Gestión de Rifas

Este directorio contiene scripts para interactuar con el sistema de rifas.

## 🔧 Configuración

Asegúrate de tener configurado tu archivo `.env` con:
```env
BASE_SEPOLIA_RPC_URL=tu_rpc_url
PRIVATE_KEY=tu_private_key
```

## 📍 Direcciones Importantes

- **Factory Address**: `0x104032d5377be9b78441551e169f3C8a3d520672`
- **Entropy Address**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`

## 📝 Scripts Disponibles

### 1. Factory Management

#### `createNewRaffle.ts`
Crea una nueva rifa usando el RaffleFactory.

```bash
npx tsx scripts/createNewRaffle.ts
```

**Parámetros a configurar** (dentro del script):
- `RAFFLE_NAME`: Nombre de la rifa
- `RAFFLE_DESCRIPTION`: Descripción
- `PROJECT_PERCENTAGE`: Porcentaje para el proyecto (en basis points, ej: 3000 = 30%)
- `PROJECT_ADDRESS`: Dirección que recibirá los fondos del proyecto
- `RAFFLE_DURATION`: Duración en segundos

**Output**: Devuelve la dirección del nuevo contrato de rifa creado.

#### `listRaffles.ts`
Lista todas las rifas creadas por el factory.

```bash
npx tsx scripts/listRaffles.ts
```

**Output**: Muestra todas las rifas con su estado, tickets vendidos y participantes.

---

### 2. Participación en Rifas

#### `buyTickets.ts`
Compra tickets en una rifa específica.

```bash
npx tsx scripts/buyTickets.ts
```

**Configurar antes de ejecutar**:
- `RAFFLE_ADDRESS`: Dirección de la rifa
- `AMOUNT_ETH`: Cantidad en ETH a gastar en tickets

#### `showRaffle.ts`
Muestra información detallada de una rifa.

```bash
npx tsx scripts/showRaffle.ts
```

**Configurar antes de ejecutar**:
- `RAFFLE_ADDRESS`: Dirección de la rifa a consultar

---

### 3. Gestión de Rifas (Owner/Admin)

#### `closeRaffle.ts`
Cierra una rifa y solicita el número aleatorio para seleccionar ganador.

```bash
npx tsx scripts/closeRaffle.ts
```

**Configurar antes de ejecutar**:
- `RAFFLE_ADDRESS`: Dirección de la rifa a cerrar

**Requisitos**:
- Ser owner o admin de la rifa
- La rifa debe estar en estado `Active`
- Debe haber tickets vendidos

**Proceso**:
1. Solicita entropía a Pyth (requiere pagar un fee ~0.0001 ETH)
2. Pyth responde automáticamente llamando a `entropyCallback()`
3. Se selecciona el ganador

⏳ **Nota**: Después de ejecutar este script, espera unos minutos a que Pyth responda.

#### `distributeFunds.ts`
Distribuye los fondos entre proyecto, plataforma y ganador.

```bash
npx tsx scripts/distributeFunds.ts
```

**Configurar antes de ejecutar**:
- `RAFFLE_ADDRESS`: Dirección de la rifa

**Requisitos**:
- El sorteo debe haber sido ejecutado (estado `DrawExecuted`)
- Los fondos no deben haber sido distribuidos previamente

**Distribución**:
- Platform Fee: 0.05%
- Proyecto: Porcentaje configurado en la rifa
- Ganador: El resto

---

### 4. Retiro de Fondos

#### `withdrawPayments.ts`
Retira los fondos asignados a tu dirección.

```bash
npx tsx scripts/withdrawPayments.ts
```

**Configurar antes de ejecutar**:
- `RAFFLE_ADDRESS`: Dirección de la rifa

**Quién puede usar este script**:
- El ganador de la rifa
- El proyecto beneficiario
- El administrador de la plataforma

**Nota**: Cada beneficiario debe ejecutar este script por separado para retirar sus fondos.

---

### 5. Utilidades

#### `checkBalance.ts`
Verifica el balance de una dirección.

```bash
npx tsx scripts/checkBalance.ts
```

---

## 🔄 Flujo Completo de una Rifa

### Como Organizador:

1. **Crear Rifa**
   ```bash
   npx tsx scripts/createNewRaffle.ts
   ```
   → Anota la dirección del contrato creado

2. **Promocionar** y esperar que los usuarios compren tickets

3. **Ver Estado**
   ```bash
   # Actualiza RAFFLE_ADDRESS en showRaffle.ts
   npx tsx scripts/showRaffle.ts
   ```

4. **Cerrar Rifa** (cuando termine el tiempo o desees cerrarla)
   ```bash
   # Actualiza RAFFLE_ADDRESS en closeRaffle.ts
   npx tsx scripts/closeRaffle.ts
   ```
   ⏳ Espera ~2-5 minutos

5. **Distribuir Fondos**
   ```bash
   # Actualiza RAFFLE_ADDRESS en distributeFunds.ts
   npx tsx scripts/distributeFunds.ts
   ```

6. **Retirar tus Fondos** (como admin de plataforma)
   ```bash
   # Actualiza RAFFLE_ADDRESS en withdrawPayments.ts
   npx tsx scripts/withdrawPayments.ts
   ```

### Como Participante:

1. **Ver Rifas Disponibles**
   ```bash
   npx tsx scripts/listRaffles.ts
   ```

2. **Ver Detalles de una Rifa**
   ```bash
   # Actualiza RAFFLE_ADDRESS en showRaffle.ts
   npx tsx scripts/showRaffle.ts
   ```

3. **Comprar Tickets**
   ```bash
   # Actualiza RAFFLE_ADDRESS y AMOUNT_ETH en buyTickets.ts
   npx tsx scripts/buyTickets.ts
   ```

4. **Si Ganas: Retirar Fondos**
   ```bash
   # Actualiza RAFFLE_ADDRESS en withdrawPayments.ts
   npx tsx scripts/withdrawPayments.ts
   ```

---

## 🚨 Notas Importantes

1. **Modificación del Contrato**: El contrato ProjectRaffle ha sido modificado para permitir el cierre anticipado de rifas (comentada la validación de tiempo en `requestEntropy`).

2. **Gas Fees**: Todas las transacciones requieren gas. Asegúrate de tener suficiente ETH en tu wallet.

3. **Pyth Entropy Fee**: Cerrar una rifa requiere pagar el fee de Pyth (~0.0001 ETH), que se envía automáticamente.

4. **Pull Payment Pattern**: Los fondos no se envían automáticamente. Cada beneficiario debe llamar a `withdrawPayments()`.

5. **Inmutabilidad**: Los contratos desplegados no pueden modificarse. Si necesitas cambiar algo, debes desplegar un nuevo contrato.

---

## 🐛 Troubleshooting

### "Raffle still active"
- Espera a que termine el tiempo de la rifa O
- Si modificaste el contrato, asegúrate de haber desplegado uno nuevo

### "Insufficient fee"
- El script calcula automáticamente el fee de Pyth, pero asegúrate de tener ETH suficiente

### "Only entropy contract"
- No llames a `entropyCallback()` manualmente, Pyth lo hace automáticamente

### "Funds already distributed"
- Los fondos solo pueden distribuirse una vez por rifa

### "No tickets sold"
- Necesitas al menos un participante para cerrar la rifa

---

## 📚 Recursos Adicionales

- [Documentación de Hardhat](https://hardhat.org/docs)
- [Documentación de Pyth Entropy](https://docs.pyth.network/entropy)
- [Documentación de OpenZeppelin](https://docs.openzeppelin.com/)


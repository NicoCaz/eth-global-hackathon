export const RAFFLE_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "projectPercentage",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "projectAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "raffleDuration",
        "type": "uint256"
      }
    ],
    "name": "createRaffle",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "raffleAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "projectName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "projectPercentage",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "RaffleCreated",
    "type": "event"
  }
] as const;


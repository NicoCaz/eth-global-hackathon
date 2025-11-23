import { createFileRoute } from '@tanstack/react-router'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { useEffect, useState } from 'react'
import { CAMPAIGN_FACTORY_ADDRESS } from '../constants/web3'

export const Route = createFileRoute('/test-factory')({
  component: TestFactory,
})

const factoryAbi = [
  {
    inputs: [],
    name: 'getAllRaffles',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRaffleCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getRaffleInfo',
    outputs: [
      { internalType: 'address', name: 'raffleAddress', type: 'address' },
      { internalType: 'string', name: 'projectName', type: 'string' },
      { internalType: 'uint8', name: 'state', type: 'uint8' },
      { internalType: 'uint256', name: 'totalTickets', type: 'uint256' },
      { internalType: 'uint256', name: 'participantCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

type RaffleInfo = {
  address: string
  name: string
  state: number
  totalTickets: bigint
  participantCount: bigint
}

function TestFactory() {
  const [raffles, setRaffles] = useState<RaffleInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        console.log('Fetching from factory:', CAMPAIGN_FACTORY_ADDRESS)

        // Get total count
        const count = await client.readContract({
          address: CAMPAIGN_FACTORY_ADDRESS as `0x${string}`,
          abi: factoryAbi,
          functionName: 'getRaffleCount',
        })

        console.log('Raffle count:', count)

        const loadedRaffles: RaffleInfo[] = []
        
        // Fetch info for each raffle
        for (let i = 0; i < Number(count); i++) {
          const info = await client.readContract({
            address: CAMPAIGN_FACTORY_ADDRESS as `0x${string}`,
            abi: factoryAbi,
            functionName: 'getRaffleInfo',
            args: [BigInt(i)],
          })
          
          // info is [address, name, state, totalTickets, participantCount]
          loadedRaffles.push({
            address: info[0],
            name: info[1],
            state: info[2],
            totalTickets: info[3],
            participantCount: info[4]
          })
        }

        setRaffles(loadedRaffles)
      } catch (err: any) {
        console.error('Error fetching raffles:', err)
        setError(err.message || 'Failed to fetch raffles')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getStateName = (state: number) => {
    switch (state) {
      case 0: return 'Active'
      case 1: return 'Calculating' // Or whatever the enum values are
      case 2: return 'Completed'
      case 3: return 'Cancelled'
      default: return 'Unknown'
    }
  }

  return (
    <div className="p-4 container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Factory Data Debug</h1>
      
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="font-mono text-sm">Factory Address: {CAMPAIGN_FACTORY_ADDRESS}</p>
      </div>

      {loading && <div>Loading raffles...</div>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          Error: {error}
        </div>
      )}

      {!loading && !error && raffles.length === 0 && (
        <div>No raffles found.</div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {raffles.map((raffle, idx) => (
          <div key={idx} className="border p-4 rounded shadow bg-white dark:bg-gray-900 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-2">{raffle.name}</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">Address:</span> <span className="font-mono text-xs">{raffle.address}</span></p>
              <p><span className="font-bold">State:</span> {getStateName(raffle.state)} ({raffle.state})</p>
              <p><span className="font-bold">Tickets Sold:</span> {raffle.totalTickets.toString()}</p>
              <p><span className="font-bold">Participants:</span> {raffle.participantCount.toString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


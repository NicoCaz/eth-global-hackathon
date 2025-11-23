import { config } from 'dotenv'
import { createInterface } from 'readline'
import { db } from '../index.js'
import { campaigns, donations, raffleWinners } from '../schema.js'

// Load environment variables
config()

function askQuestion(query: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function clear() {
  console.log('⚠️  WARNING: This will permanently delete ALL data from the database!')
  console.log('   - All campaigns')
  console.log('   - All donations')
  console.log('   - All raffle winners')
  console.log('')

  try {
    // First confirmation
    const firstAnswer = await askQuestion('Are you sure you want to clear the database? (yes/no): ')
    
    if (firstAnswer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.')
      process.exit(0)
    }

    // Second confirmation - must type DELETE
    console.log('')
    const secondAnswer = await askQuestion('This action cannot be undone. Type "DELETE" to confirm: ')
    
    if (secondAnswer !== 'DELETE') {
      console.log('❌ Operation cancelled. Confirmation text did not match.')
      process.exit(0)
    }

    console.log('')
    console.log('🗑️  Clearing database...')

    // Delete in correct order (respect foreign keys)
    await db.delete(raffleWinners)
    console.log('✓ Cleared raffle winners')

    await db.delete(donations)
    console.log('✓ Cleared donations')

    await db.delete(campaigns)
    console.log('✓ Cleared campaigns')

    console.log('')
    console.log('✅ Database cleared successfully!')

  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  }

  process.exit(0)
}

clear()


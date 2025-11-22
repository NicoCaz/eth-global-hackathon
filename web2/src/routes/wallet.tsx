import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/wallet')({
  component: WalletPage,
})

function WalletPage() {
  const [WalletComponent, setWalletComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Only load CDP components on the client side to avoid SSR issues
    import('../components/wallet/WalletApp').then((mod) => {
      setWalletComponent(() => mod.default)
    })
  }, [])

  if (!WalletComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading wallet...</div>
      </div>
    )
  }

  return <WalletComponent />
}


import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [ProfileComponent, setProfileComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    // Only load CDP components on the client side to avoid SSR issues
    import('../components/wallet/ProfileContent.tsx').then((mod) => {
      setProfileComponent(() => mod.default)
    })
  }, [])

  if (!ProfileComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  return <ProfileComponent />
}

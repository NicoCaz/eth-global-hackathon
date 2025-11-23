import { createFileRoute, Outlet } from '@tanstack/react-router'
import { CDPReactProvider } from "@coinbase/cdp-react";
import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import { CDP_CONFIG } from '@/config/cdp'
import { theme } from '@/config/theme'
import SignInScreen from '@/components/wallet/SignInScreen'
import Loading from '@/components/wallet/Loading'
import AuthHeader from '@/components/wallet/AuthHeader'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      <AuthContent />
    </CDPReactProvider>
  )
}

function AuthContent() {
  const { isInitialized } = useIsInitialized()
  const { isSignedIn } = useIsSignedIn()

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <SignInScreen />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

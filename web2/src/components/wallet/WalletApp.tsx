import { CDPReactProvider } from "@coinbase/cdp-react";
import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";

import { CDP_CONFIG } from '../../config/cdp'
import { theme } from '../../config/theme'
import Loading from './Loading'
import SignedInScreen from './SignedInScreen'
import SignInScreen from './SignInScreen'

function WalletApp() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  return (
    <div className="flex flex-col items-center justify-center flex-grow">
      {!isInitialized && <Loading />}
      {isInitialized && (
        <>
          {!isSignedIn && <SignInScreen />}
          {isSignedIn && <SignedInScreen />}
        </>
      )}
    </div>
  );
}

export default function WalletAppWrapper() {
  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      <WalletApp />
    </CDPReactProvider>
  )
}


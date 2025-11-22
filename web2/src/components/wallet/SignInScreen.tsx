import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

/**
 * The Sign In screen
 */
function SignInScreen() {
  return (
    <main className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 justify-between max-w-[30rem] text-center w-full">
      <h1 className="sr-only">Sign in</h1>
      <p className="text-xl font-medium leading-tight m-0">Welcome!</p>
      <p>Please sign in to continue.</p>
      <AuthButton />
    </main>
  );
}

export default SignInScreen;


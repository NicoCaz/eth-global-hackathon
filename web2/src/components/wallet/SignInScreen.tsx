import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { Button } from "@coinbase/cdp-react/components/ui/Button";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
     <div>
       {/*Go back to home button*/}
       <Link to="/">
       <Button variant="linkSecondary">
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-foreground hover:text-muted-foreground transition-colors font-medium">Go back to home</span>
      </Button>
      </Link>
     </div>
    </main>
  );
}

export default SignInScreen;


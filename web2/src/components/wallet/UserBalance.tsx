import { LoadingSkeleton } from "@coinbase/cdp-react/components/ui/LoadingSkeleton";

interface Props {
  balance?: string;
}

/**
 * A component that displays the user's balance.
 *
 * @param {Props} props - The props for the UserBalance component.
 * @param {string} [props.balance] - The user's balance.
 * @returns A component that displays the user's balance.
 */
function UserBalance(props: Props) {
  const { balance } = props;

  return (
    <>
      <h2 className="text-xl font-medium leading-tight m-0">Available balance</h2>
      <p className="text-2xl font-normal flex flex-col items-center justify-center flex-grow">
        {balance === undefined && <LoadingSkeleton as="span" className="rounded-full inline-block h-9 w-28" />}
        {balance !== undefined && (
          <span className="flex flex-row items-center justify-center">
            <img src="/eth.svg" alt="" className="flex-shrink-0 flex-grow-0 h-6 mr-2 w-auto" />
            <span>{balance}</span>
            <span className="sr-only">Ethereum</span>
          </span>
        )}
      </p>
      <p>
        Get testnet ETH from{" "}
        <a
          href="https://portal.cdp.coinbase.com/products/faucet"
          target="_blank"
          rel="noopener noreferrer"
        >
          Base Sepolia Faucet
        </a>
      </p>
    </>
  );
}

export default UserBalance;


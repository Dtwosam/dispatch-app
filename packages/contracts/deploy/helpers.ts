import { readFileSync } from "fs";
import path from "path";
import {
  type GenLayerClient,
  type TransactionHash,
  TransactionStatus,
} from "genlayer-js/types";

export async function deployPythonContract(
  client: GenLayerClient<any>,
  contractPath: string,
  args: unknown[],
) {
  const filePath = path.resolve(process.cwd(), contractPath);
  const contractCode = new Uint8Array(readFileSync(filePath));

  await client.initializeConsensusSmartContract();

  const txHash = await client.deployContract({
    code: contractCode,
    args,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as TransactionHash,
    interval: 5000,
    retries: 200,
  });

  if (
    receipt.statusName !== TransactionStatus.ACCEPTED &&
    receipt.statusName !== TransactionStatus.FINALIZED
  ) {
    throw new Error(`Deployment failed for ${contractPath}: ${JSON.stringify(receipt)}`);
  }

  const address =
    receipt.data?.contract_address
    ?? (receipt.txDataDecoded as { contractAddress?: string } | undefined)?.contractAddress
    ?? null;

  if (!address) {
    throw new Error(`Could not determine deployed address for ${contractPath}`);
  }

  return { txHash, receipt, address };
}

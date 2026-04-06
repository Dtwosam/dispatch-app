import type { GenLayerClient } from "genlayer-js/types";
import { deployPythonContract } from "./helpers";

const treasury = process.env.MARKETPLACE_TREASURY_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const registry = process.env.MARKETPLACE_AGENT_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const feeBps = Number(process.env.MARKETPLACE_PROTOCOL_FEE_BPS ?? "250");

export default async function main(client: GenLayerClient<any>) {
  return deployPythonContract(
    client,
    "packages/contracts/.generated/task_escrow.py",
    [treasury, registry, feeBps],
  );
}

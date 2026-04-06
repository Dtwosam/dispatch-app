import type { GenLayerClient } from "genlayer-js/types";
import { deployPythonContract } from "./helpers";

export default async function main(client: GenLayerClient<any>) {
  return deployPythonContract(
    client,
    "packages/contracts/.generated/agent_registry.py",
    [],
  );
}

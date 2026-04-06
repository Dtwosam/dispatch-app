import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const contractsRoot = resolve(packageRoot, "arc");
const outRoot = resolve(packageRoot, "artifacts", "arc");

const sources = {
  "DispatchAgentRegistry.sol": {
    content: readFileSync(resolve(contractsRoot, "DispatchAgentRegistry.sol"), "utf8"),
  },
  "DispatchMarketplace.sol": {
    content: readFileSync(resolve(contractsRoot, "DispatchMarketplace.sol"), "utf8"),
  },
};

const input = {
  language: "Solidity",
  sources,
  settings: {
    viaIR: true,
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors?.length) {
  const fatal = output.errors.filter((item) => item.severity === "error");
  for (const item of output.errors) {
    console[item.severity === "error" ? "error" : "warn"](item.formattedMessage);
  }
  if (fatal.length) process.exit(1);
}

mkdirSync(outRoot, { recursive: true });
for (const [fileName, contracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, artifact] of Object.entries(contracts || {})) {
    const target = resolve(outRoot, `${contractName}.json`);
    writeFileSync(
      target,
      JSON.stringify({
        contractName,
        sourceName: fileName,
        abi: artifact.abi,
        bytecode: `0x${artifact.evm?.bytecode?.object || ""}`,
      }, null, 2),
    );
    console.log(`wrote ${target}`);
  }
}

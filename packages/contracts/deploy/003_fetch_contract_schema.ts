const rpcUrl = process.env.GENLAYER_RPC_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!rpcUrl || !contractAddress) {
  throw new Error("GENLAYER_RPC_URL and CONTRACT_ADDRESS are required");
}

const response = await fetch(rpcUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "gen_getContractSchema",
    params: [contractAddress],
  }),
});

const payload = await response.json();
if (payload.error) {
  throw new Error(JSON.stringify(payload.error));
}

console.log(JSON.stringify(payload.result, null, 2));

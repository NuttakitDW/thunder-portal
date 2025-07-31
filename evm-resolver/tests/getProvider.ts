import { createServer, CreateServerReturnType } from "prool";
import { anvil } from "prool/instances";
import { JsonRpcProvider } from "ethers";
import assert from "node:assert";
import { ChainConfig } from "./config";

export async function getProvider(
  cnf: ChainConfig
): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
  if (!cnf.createFork) {
    return {
      provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true,
      }),
    };
  }

  const node = createServer({
    instance: anvil({ forkUrl: cnf.url, chainId: cnf.chainId }),
    limit: 1,
  });
  await node.start();

  const address = node.address();
  assert(address);

  const provider = new JsonRpcProvider(
    `http://[${address.address}]:${address.port}/1`,
    cnf.chainId,
    {
      cacheTimeout: -1,
      staticNetwork: true,
    }
  );

  return {
    provider,
    node,
  };
}
import { Address } from "@1inch/cross-chain-sdk";
import {
  computeAddress,
  JsonRpcProvider,
  Wallet as SignerWallet,
} from "ethers";
import factoryContract from "../dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json";
import resolverContract from "../dist/contracts/Resolver.sol/Resolver.json";
import { getProvider } from "./getProvider";
import { ChainConfig } from "./config";
import { CreateServerReturnType } from "prool";
import { deploy } from "./deploy";
const resolverPk =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";


export async function initChain(cnf: ChainConfig): Promise<{
  node?: CreateServerReturnType;
  provider: JsonRpcProvider;
  escrowFactory: string;
  resolver: string;
}> {
  const { node, provider } = await getProvider(cnf);
  const deployer = new SignerWallet(cnf.ownerPrivateKey, provider);

  // deploy EscrowFactory
  const escrowFactory = await deploy(
    factoryContract,
    [
      cnf.limitOrderProtocol,
      cnf.wrappedNative, // feeToken,
      Address.fromBigInt(0n).toString(), // accessToken,
      deployer.address, // owner
      60 * 30, // src rescue delay
      60 * 30, // dst rescue delay
    ],
    provider,
    deployer
  );
  console.log(
    `[${cnf.chainId}]`,
    `Escrow factory contract deployed to`,
    escrowFactory
  );

  // deploy Resolver contract
  const resolver = await deploy(
    resolverContract,
    [
      escrowFactory,
      cnf.limitOrderProtocol,
      computeAddress(resolverPk), // resolver as owner of contract
    ],
    provider,
    deployer
  );
  console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver);

  return { node: node, provider, resolver, escrowFactory };
}
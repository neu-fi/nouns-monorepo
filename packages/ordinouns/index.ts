import { ChainId, getContractAddressesForChainOrThrow } from '@nouns/sdk';

const { nounsToken } = getContractAddressesForChainOrThrow(ChainId.Mainnet);

console.log(nounsToken);


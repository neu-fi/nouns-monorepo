import { providers } from 'ethers';
import {
    ChainId,
    getContractAddressesForChainOrThrow,
    getContractsForChainOrThrow,
    NounsTokenABI,
    PNGCollectionEncoder
} from '@nouns/sdk';
// import { readPngFile } from 'node-libpng';
import { promises as fs } from 'fs';
// import path from 'path';

const RPC_URL = 'https://mainnet.infura.io/v3/145ce7b859284acb90fd94046cc16dd1';

const provider = new providers.JsonRpcProvider(RPC_URL);

const contractAddresses = getContractAddressesForChainOrThrow(ChainId.Mainnet);

const { nounsTokenContract } = getContractsForChainOrThrow(ChainId.Mainnet, provider);

console.log(nounsTokenContract);

// const DESTINATION = path.join(__dirname, './output/image-data.json');

// const encode = async () => {
//   const encoder = new PNGCollectionEncoder();

//   const folders = ['bodies', 'accessories', 'heads', 'glasses'];
//   for (const folder of folders) {
//     const folderpath = path.join(__dirname, './images', folder);
//     const files = await fs.readdir(folderpath);
//     for (const file of files) {
//       const image = await readPngFile(path.join(folderpath, file));
//       encoder.encodeImage(file.replace(/\.png$/, ''), image, folder);
//     }
//   }
//   await encoder.writeToFile(DESTINATION);
// };

// encode();

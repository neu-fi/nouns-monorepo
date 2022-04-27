import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import hardhat from 'hardhat';
const { ethers } = hardhat;
import {
  deployNounsToken,
  getSigners,
  TestSigners,
  setTotalSupply,
  populateDescriptor,
  advanceBlocks,
  propStateToString,
  deployGovernorV1,
  deployGovernorV2,
  propose,
} from '../../utils';
import { mineBlock } from '../../utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  NounsToken,
  NounsDescriptor__factory as NounsDescriptorFactory,
  NounsDaoLogicV1,
  NounsDaoLogicV1__factory as NounsDaoLogicV1Factory,
  NounsDaoLogicV2,
  NounsDaoLogicV2__factory as NounsDaoLogicV2Factory,
} from '../../../typechain';
import { MAX_QUORUM_VOTES_BPS, MIN_QUORUM_VOTES_BPS } from '../../constants';

chai.use(solidity);
const { expect } = chai;

const V1_QUORUM_BPS = 100;

let token: NounsToken;
let deployer: SignerWithAddress;
let account0: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: TestSigners;

let govProxyAddress: string;
let govV1: NounsDaoLogicV1;
let govV2: NounsDaoLogicV2;

async function setupWithV1() {
  token = await deployNounsToken(signers.deployer);

  await populateDescriptor(
    NounsDescriptorFactory.connect(await token.descriptor(), signers.deployer),
  );

  await setTotalSupply(token, 100);

  ({ address: govProxyAddress } = await deployGovernorV1(deployer, token.address, V1_QUORUM_BPS));
}

describe('NounsDAO upgrade to V2', () => {
  before(async () => {
    signers = await getSigners();
    deployer = signers.deployer;
    account0 = signers.account0;
    account1 = signers.account1;
    account2 = signers.account2;

    await setupWithV1();

    govV1 = NounsDaoLogicV1Factory.connect(govProxyAddress, deployer);
    govV2 = NounsDaoLogicV2Factory.connect(govProxyAddress, deployer);
  });

  it('Simulate some proposals in V1', async () => {
    await token.connect(deployer).transferFrom(deployer.address, account0.address, 0);
    await token.connect(deployer).transferFrom(deployer.address, account1.address, 1);

    // Prop 1
    await propose(govV1, account0);
    await mineBlock();
    await govV1.connect(account0).castVote(1, 1);
    await advanceBlocks(2000);

    // Prop 2
    await propose(govV1, account1);
    await advanceBlocks(2);

    // Prop 3
    await propose(govV1, account0);
    await advanceBlocks(2);
  });

  it('and upgrade to V2', async () => {
    await deployGovernorV2(deployer, govProxyAddress);
  });

  it('and V2 config set', async () => {
    expect(await govV2.minQuorumVotesBPS()).to.equal(MIN_QUORUM_VOTES_BPS);
    expect(await govV2.maxQuorumVotesBPS()).to.equal(MAX_QUORUM_VOTES_BPS);
  });

  it('and V1 proposalCount stayed the same, meaning the storage slot below the rename is good', async () => {
    expect(await govV2.proposalCount()).to.equal(3);
  });

  it('and V1 Props have the same quorumVotes', async () => {
    expect(await govV2.quorumVotes(3)).to.equal(1);
  });

  it('and V2 props have a different quorum', async () => {
    await token.connect(deployer).transferFrom(deployer.address, account2.address, 3);
    const propId = await propose(govV2, account2);

    expect(await govV2.quorumVotes(propId)).to.equal(2);
  });

  it('and V1 and V2 props reach their end state as expected', async () => {
    await govV2.connect(account0).castVote(3, 1);
    // Prop 4 will fail because it's using the new and higher quorum
    await govV2.connect(account1).castVote(4, 1);

    await advanceBlocks(2000);

    expect(propStateToString(await govV2.state(1)), '1').to.equal('Succeeded');
    expect(propStateToString(await govV2.state(2)), '2').to.equal('Defeated');
    expect(propStateToString(await govV2.state(3)), '3').to.equal('Succeeded');
    expect(propStateToString(await govV2.state(4)), '4').to.equal('Defeated');
  });
});

import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';

export default task('withdraw-prize', 'Withdraw ballot prize')
  .addParam(
    'ballotid',
    'Ballot id',
    '',
    types.int
  )
  .addParam(
    'sender',
    'Winner address',
    '',
    types.string
  )
  .setAction(async ({ ballotid, sender }, hre) => {
    if (!process.env.CONTRACT_ADDRESS) {
      console.error('CONTRACT_ADDRESS is required!');
      return;
    }

    const artifact = await hre.artifacts.readArtifact('CryptoBallot');
    const [owner] = await hre.ethers.getSigners();
    const signer = await hre.ethers.getSigner(sender);
    const contract = new hre.ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      artifact.abi,
      owner
    );

    const result = await contract.connect(signer).withdrawBallotPrize(ballotid);

    console.log(result);
  });
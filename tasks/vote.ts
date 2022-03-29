import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';

export default task('vote', 'Make vote')
  .addParam(
    'ballotid',
    'Ballot id',
    '',
    types.int
  )
  .addParam(
    'candidateid',
    'Candidate id',
    '',
    types.int
  )
  .addParam(
    'sender',
    'Voter address',
    '',
    types.string
  )
  .setAction(async ({ ballotid, candidateid, sender }, hre) => {
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

    const result = await contract.connect(signer).vote(ballotid, candidateid, { value: hre.ethers.utils.parseEther('0.01') });

    console.log(result);
  });
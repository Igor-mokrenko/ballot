import { expect } from "chai";
import { ethers } from "hardhat";
import { describe } from "mocha";

import { CryptoBallot } from "../typechain";

const customVMException = 'VM Exception while processing transaction: reverted with custom error'
const revertedReason = 'reverted with reason string';
const nullAddress = '0x0000000000000000000000000000000000000000';

describe('Ballot', () => {
  let ballot: CryptoBallot;

  beforeEach(async () => {
    const Ballot = await ethers.getContractFactory('CryptoBallot');
    ballot = await Ballot.deploy() as CryptoBallot;
    await ballot.deployed();
  });

  describe('New ballot function', () => {
    it('Should set the right owner', async () => {
      const [owner, addr1, addr2] = await ethers.getSigners();
      const result = await ballot
        .connect(owner)
        .newBallot(259200, 'test', [addr1.address, addr2.address]);
        
      expect(result.from).to.equal(owner.address);
    });

    it('Should revert with not owner', async () => {
      const [owner, notOwner] = await ethers.getSigners();

      await expect(
        ballot
          .connect(notOwner)
          .newBallot(259200, 'test', [owner.address, notOwner.address])
      )
        .to
        .be
        .revertedWith(`${customVMException} 'NotOwner()'`);
    });

    it('Should revert with candidates list required', async () => {
      const [owner] = await ethers.getSigners();

      await expect(
        ballot
          .connect(owner)
          .newBallot(259200, 'test', [])
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'Candidates list are required'`);
    });

    it('Should revert with Ballot name should not be empty', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await expect(
        ballot
          .connect(owner)
          .newBallot(259200, '', [owner.address, addr1.address])
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'Ballot name should not be empty'`);
    });

    it('Should revert with Ballot duration should be grater than 0', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await expect(
        ballot
          .connect(owner)
          .newBallot(0, 'test', [owner.address, addr1.address])
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'Ballot duration should be grater than 0'`);
    });
  });

  describe('Get ballots stat list function', () => {
    it('Should return ballots stat list', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await ballot
        .connect(owner)
        .newBallot(259200, 'test 1', [owner.address, addr1.address]);

      const ballotStatList = await ballot.getBallotsStatList();
      
      expect(ballotStatList.length).to.equal(2);
      expect(ballotStatList[1].name).to.equal('test 1');
    });
  });

  describe('Get ballot stat function', () => {
    it('Should revert with This ballot dosent exist', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(
        ballot
          .connect(owner)
          .getBallotStat(1)
      )
        .to
        .be
        .revertedWith(`${customVMException} 'BallotDosentExist()'`)
    });

    it('Should return ballot stat', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      const ballotStat = await ballot.getBallotStat(0);

      expect(ballotStat.id).equal(0);
      expect(ballotStat.name).equal('test');
      expect(ballotStat.finished).equal(false);
      expect(ballotStat.winner).equal(nullAddress);
      expect(ballotStat.prizeFund).equal(0);
      expect(ballotStat.voters.length).equal(0);
      expect(ballotStat.candidates.length).equal(2);
    });
  });

  describe('Vote function', () => {
    it('Should revert with This ballot dosent exist', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(
        ballot
          .connect(owner)
          .vote(1, 1)
      )
        .to
        .be
        .revertedWith(`${customVMException} 'BallotDosentExist()'`)
    });

    it('Should revert with This ballot already expired', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(async () => {
          await ballot.finishBallot(0);
          resolve(0);
        }, 1000);
      });

      await expect(
        ballot
          .connect(addr1)
          .vote(0, 1, {
            value: ethers.utils.parseEther('0.01')
          })
      )
        .to
        .be
        .revertedWith(`${customVMException} 'BallotFinished()'`)
    });

    it('Should revert with You already voted', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await ballot
        .connect(addr1)
        .vote(0, 1, {
          value: ethers.utils.parseEther('0.01')
        });

      await expect(
        ballot
          .connect(addr1)
          .vote(0, 1, {
            value: ethers.utils.parseEther('0.01')
          })
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'You already voted'`)
    });

    it('Should revert with Candidate dosent exist', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(
        ballot
          .connect(owner)
          .vote(0, 2)
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'Candidate dosent exist'`)
    });

    it('Should revert with Voting fee must be equal to 0.01 ETH', async () => {
      const [owner, addr1, addr2] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(
        ballot
          .connect(addr2)
          .vote(0, 0, {
            value: ethers.utils.parseEther('0.001')
          })
      )
        .to
        .be
        .revertedWith(`${revertedReason} 'Voting fee must be equal to 0.01 ETH'`)
    });

    it('Should add vote', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await ballot.connect(owner).vote(0, 1, {
        value: ethers.utils.parseEther('0.01')
      });

      const ballotStat = await ballot.getBallotStat(0);

      expect(ballotStat.voters.length).to.equal(1);
      expect(ballotStat.candidates[1].votesCount).to.equal(1);
      expect(ballotStat.prizeFund).to.equal(ethers.utils.parseEther('0.01'));
    });
  });

  describe('Finish ballot function', () => {
    it('Should revert with This ballot dosent exist', async () => {
      const [owner, addr1] = await ethers.getSigners();
      
      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(ballot.finishBallot(1))
        .to
        .be
        .revertedWith(`${customVMException} 'BallotDosentExist()'`)
    });

    it('Should revert with This ballot already finished', async () => {
      const [owner, addr1] = await ethers.getSigners();
      
      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      await expect(ballot.finishBallot(0))
        .to
        .be
        .revertedWith(`${customVMException} 'BallotFinished()'`)
    });

    it('Should revert with This ballot dosent expired', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(259200, 'test', [owner.address, addr1.address]);

      await expect(ballot.finishBallot(0))
        .to
        .be
        .revertedWith(`${customVMException} 'BallotActive()'`)
    });

    it('Should finish ballot with right winner', async () => {
      const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot
        .connect(addr2)
        .vote(0, 0, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr3)
        .vote(0, 0, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr4)
        .vote(0, 0, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr5)
        .vote(0, 1, {
          value: ethers.utils.parseEther('0.01')
        });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      const finishedBallot = await ballot.getBallotStat(0);

      expect(finishedBallot.finished).equal(true);
      expect(finishedBallot.winner).to.equal(owner.address);
    });

    it('Should finish ballot with random winner', async () => {
      const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot
        .connect(addr2)
        .vote(0, 0, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr3)
        .vote(0, 0, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr4)
        .vote(0, 1, {
          value: ethers.utils.parseEther('0.01')
        });

      await ballot
        .connect(addr5)
        .vote(0, 1, {
          value: ethers.utils.parseEther('0.01')
        });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      const finishedBallot = await ballot.getBallotStat(0);

      expect(finishedBallot.finished).equal(true);
      expect(finishedBallot.winner)
        .not
        .be
        .equal(nullAddress)
    });

    it('Should finish ballot with undefined winner', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      const finishedBallot = await ballot.getBallotStat(0);

      expect(finishedBallot.finished).equal(true);
      expect(finishedBallot.winner)
        .to
        .be
        .equal(nullAddress)
    });
  });

  describe('Withdraw ballot prize function', () => {
    it('Should revert with This ballot dosent exist', async () => {
      const [owner, addr1] = await ethers.getSigners();
      
      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await expect(ballot.withdrawBallotPrize(1))
        .to
        .be
        .revertedWith(`${customVMException} 'BallotDosentExist()'`)
    });

    it('Should revert with This ballot dosent expired', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(100, 'test', [owner.address, addr1.address]);

      await expect(ballot.withdrawBallotPrize(0))
        .to
        .be
        .revertedWith(`${customVMException} 'BallotActive()'`)
    });

    it('Should revert with There is no winner for this ballot', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      await expect(ballot.withdrawBallotPrize(0))
        .to
        .be
        .revertedWith(`${revertedReason} 'There is no winner for this ballot'`)
    });

    it('Should revert with Only ballot winner can withdraw prize fund', async () => {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot.connect(addr2).vote(0, 0, { value: ethers.utils.parseEther('0.01') });
      await ballot.connect(addr3).vote(0, 0, { value: ethers.utils.parseEther('0.01') });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      await expect(ballot.connect(addr1).withdrawBallotPrize(0))
        .to
        .be
        .revertedWith(`${revertedReason} 'Only ballot winner can withdraw prize fund'`)
    });

    it('Should revert with Nothing to withdraw', async () => {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot.connect(addr2).vote(0, 0, { value: ethers.utils.parseEther('0.01') });
      await ballot.connect(addr3).vote(0, 0, { value: ethers.utils.parseEther('0.01') });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);
      await ballot.connect(owner).withdrawBallotPrize(0);

      await expect(ballot.connect(owner).withdrawBallotPrize(0))
        .to
        .be
        .revertedWith(`${revertedReason} 'Nothing to withdraw'`)
    });

    it('Should transfer correct prize fund to winner', async () => {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') });
      await ballot.connect(addr3).vote(0, 1, { value: ethers.utils.parseEther('0.01') });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);

      const winnerBalance = await addr1.getBalance();
      const transaction = await ballot.connect(addr1).withdrawBallotPrize(0);
      const transactionResult = await transaction.wait();
      const gasUsed = transactionResult.gasUsed.mul(transactionResult.effectiveGasPrice);
      const updatedWinnerBalance = await addr1.getBalance();
      const platformFee = ethers.utils.parseEther('0.02').div(100).mul(10);
      const expectedWinnerBalance = ethers.utils.parseEther('0.02').add(winnerBalance).sub(gasUsed).sub(platformFee);

      expect(updatedWinnerBalance).to.equal(expectedWinnerBalance);
    });
  });

  describe('Withdraw platform fund', () => {
    it('Should revert with Only owner has rights for this operation', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);
      await expect(
        ballot.connect(addr1).withdrawPlatformFund()
      )
        .to 
        .be
        .revertedWith(`${customVMException} 'NotOwner()'`);
    });

    it('Should revert with Nothing to withdraw', async () => {
      const [owner, addr1] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);
      await expect(
        ballot.connect(owner).withdrawPlatformFund()
      )
        .to 
        .be
        .revertedWith(`${revertedReason} 'Nothing to withdraw'`);
    });

    it('Should withdraw correct platform fund', async () => {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();

      await ballot
        .connect(owner)
        .newBallot(1, 'test', [owner.address, addr1.address]);

      await ballot.connect(addr2).vote(0, 0, {value: ethers.utils.parseEther('0.01')});
      await ballot.connect(addr3).vote(0, 0, {value: ethers.utils.parseEther('0.01')});

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(0);
        }, 1000);
      });

      await ballot.finishBallot(0);
      
      const ownerBalance = await owner.getBalance();
      const platformFund = ethers.utils.parseEther('0.02').div(100).mul(10);
      const transaction = await ballot.connect(owner).withdrawPlatformFund();
      const transactionResult = await transaction.wait();
      const updatedOwnerBalance = await owner.getBalance();
      const gasUsed = transactionResult.gasUsed.mul(transactionResult.effectiveGasPrice);
      const expectedOwnerBalance = platformFund.sub(gasUsed).add(ownerBalance);
      
      expect(updatedOwnerBalance).to.equal(expectedOwnerBalance);
    });
  });
})

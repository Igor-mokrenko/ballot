//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract CryptoBallot {
    struct Ballot {
        uint256 id;
        string name;
        uint256 expiration;
        bool finished;
        address winner;
        uint256 votersCount;
        uint256 candidatesCount;
        uint256 prizeFund;
        mapping(address => bool) votersMap;
        mapping(uint256 => Voter) voters;
        mapping(uint256 => Candidate) candidates;
    }

    struct Voter {
        address id;
        address delegatorAddress;
    }

    struct Candidate {
        address id;
        uint256 votesCount;
    }

    struct BallotStat {
        uint256 id;
        string name;
        uint256 expiration;
        bool finished;
        address winner;
        uint256 prizeFund;
        Voter[] voters;
        Candidate[] candidates;
    }

    address private owner;
    uint256 private ballotId;
    uint256 private platformFund;
    uint256 private constant platformFeePercents = 10;
    uint256 private constant votingFee = 10000000000000000 wei;

    mapping(uint256 => Ballot) public ballots;

    /// Only owner has rights for this operation
    error NotOwner();

    /// This ballot dosent exist
    error BallotDosentExist();

    /// This ballot already expired
    error BallotFinished();

    /// This ballot dosent expired
    error BallotActive();

    modifier OwnerRights() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier IsBallotExist(uint256 _ballotId) {
        if (ballots[_ballotId].expiration == 0) revert BallotDosentExist();
        _;
    }

    modifier IsBallotFinished(uint256 _ballotId) {
        if (ballots[_ballotId].finished) revert BallotFinished();
        _;
    }

    modifier IsBallotActive(uint256 _ballotId) {
        if (block.timestamp < ballots[_ballotId].expiration)
            revert BallotActive();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function newBallot(
        uint256 _duration,
        string memory _ballotName,
        address[] memory _candidates
    ) public OwnerRights {
        require(_candidates.length > 0, "Candidates list are required");
        require(
            keccak256(abi.encodePacked(_ballotName)) !=
                keccak256(abi.encodePacked("")),
            "Ballot name should not be empty"
        );
        require(_duration > 0, "Ballot duration should be grater than 0");

        Ballot storage ballot = ballots[ballotId];
        ballot.id = ballotId;
        ballot.expiration = block.timestamp + _duration;
        ballot.finished = false;
        ballot.name = _ballotName;
        ballot.candidatesCount = _candidates.length;

        for (uint256 i = 0; i < _candidates.length; i++) {
            ballot.candidates[i] = Candidate({
                id: _candidates[i],
                votesCount: 0
            });
        }

        ballotId++;
    }

    function getBallotsStatList() public view returns (BallotStat[] memory) {
        BallotStat[] memory ballotsStatList = new BallotStat[](ballotId);

        for (uint256 i = 0; i < ballotId; i++) {
            Voter[] memory _voters = getVoters(ballots[i].votersCount, i);
            Candidate[] memory _candidates = getCandidates(
                ballots[i].candidatesCount,
                i
            );

            ballotsStatList[i] = BallotStat({
                id: ballots[i].id,
                name: ballots[i].name,
                expiration: ballots[i].expiration,
                finished: ballots[i].finished,
                winner: ballots[i].winner,
                prizeFund: ballots[i].prizeFund,
                voters: _voters,
                candidates: _candidates
            });
        }

        return ballotsStatList;
    }

    function getBallotStat(uint256 _ballotId)
        public
        view
        IsBallotExist(_ballotId)
        returns (BallotStat memory)
    {
        Voter[] memory _voters = getVoters(
            ballots[_ballotId].votersCount,
            _ballotId
        );
        Candidate[] memory _candidates = getCandidates(
            ballots[_ballotId].candidatesCount,
            _ballotId
        );

        return
            BallotStat({
                id: ballots[_ballotId].id,
                name: ballots[_ballotId].name,
                expiration: ballots[_ballotId].expiration,
                finished: ballots[_ballotId].finished,
                winner: ballots[_ballotId].winner,
                prizeFund: ballots[_ballotId].prizeFund,
                voters: _voters,
                candidates: _candidates
            });
    }

    function getVoters(uint256 _votersCount, uint256 _ballotId)
        private
        view
        returns (Voter[] memory)
    {
        Voter[] memory result = new Voter[](_votersCount);

        for (uint256 i = 0; i < _votersCount; i++) {
            result[i] = ballots[_ballotId].voters[i];
        }

        return result;
    }

    function getCandidates(uint256 _candidatesCount, uint256 _ballotId)
        private
        view
        returns (Candidate[] memory)
    {
        Candidate[] memory result = new Candidate[](_candidatesCount);

        for (uint256 i = 0; i < _candidatesCount; i++) {
            result[i] = ballots[_ballotId].candidates[i];
        }

        return result;
    }

    function vote(uint256 _ballotId, uint256 _candidateId)
        public
        payable
        IsBallotExist(_ballotId)
        IsBallotFinished(_ballotId)
    {
        require(
            ballots[_ballotId].votersMap[msg.sender] == false,
            "You already voted"
        );
        require(
            ballots[_ballotId].candidates[_candidateId].id != address(0),
            "Candidate dosent exist"
        );
        require(msg.value == votingFee, "Voting fee must be equal to 0.01 ETH");

        ballots[_ballotId].voters[ballots[_ballotId].votersCount] = Voter({
            id: msg.sender,
            delegatorAddress: ballots[_ballotId].candidates[_candidateId].id
        });

        ballots[_ballotId].prizeFund += msg.value;
        ballots[_ballotId].candidates[_candidateId].votesCount++;
        ballots[_ballotId].votersMap[msg.sender] = true;
        ballots[_ballotId].votersCount++;
    }

    function finishBallot(uint256 _ballotId)
        public
        IsBallotExist(_ballotId)
        IsBallotFinished(_ballotId)
        IsBallotActive(_ballotId)
    {
        uint256 maxVotesCnt = 0;
        uint256 winnersCount = 0;
        for (uint256 i = 0; i < ballots[_ballotId].candidatesCount; i++) {
            if (ballots[_ballotId].candidates[i].votesCount > maxVotesCnt) {
                maxVotesCnt = ballots[_ballotId].candidates[i].votesCount;
                winnersCount = 1;
            } else if (
                ballots[_ballotId].candidates[i].votesCount == maxVotesCnt &&
                ballots[_ballotId].candidates[i].votesCount != 0
            ) {
                winnersCount++;
            }
        }

        address winnerAddress;

        if (winnersCount >= 1) {
            address[] memory winners = new address[](winnersCount);
            uint256 winnerIndex = 0;
            for (uint256 i = 0; i < ballots[_ballotId].candidatesCount; i++) {
                if (
                    ballots[_ballotId].candidates[i].votesCount == maxVotesCnt
                ) {
                    winners[winnerIndex] = ballots[_ballotId].candidates[i].id;
                    winnerIndex++;
                }
            }

            if (winnersCount == 1) {
                winnerAddress = winners[0];
            } else {
                winnerAddress = winners[
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                block.timestamp,
                                block.difficulty,
                                msg.sender
                            )
                        )
                    ) % winnersCount
                ];
            }
        }

        uint256 platformFee = (ballots[_ballotId].prizeFund / 100) *
            platformFeePercents;
        platformFund += platformFee;
        ballots[_ballotId].prizeFund -= platformFee;
        ballots[_ballotId].winner = winnerAddress;
        ballots[_ballotId].finished = true;
    }

    function withdrawBallotPrize(uint256 _ballotId)
        public
        IsBallotExist(_ballotId)
        IsBallotActive(_ballotId)
    {
        require(
            ballots[_ballotId].winner != address(0),
            "There is no winner for this ballot"
        );
        require(
            msg.sender == ballots[_ballotId].winner,
            "Only ballot winner can withdraw prize fund"
        );
        require(ballots[_ballotId].prizeFund > 0, "Nothing to withdraw");

        payable(msg.sender).transfer(ballots[_ballotId].prizeFund);
        ballots[_ballotId].prizeFund = 0;
    }

    function withdrawPlatformFund() public OwnerRights {
        require(platformFund > 0, "Nothing to withdraw");

        payable(msg.sender).transfer(platformFund);
        platformFund = 0;
    }
}

const RockPaperScissors = artifacts.require("RockPaperScissors.sol");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
const helper = require('ganache-time-traveler');


contract('RockPaperScissors', (accounts) => {


//setting up five accounts
const [initPlayer, challengedPlayer, two, three, four] = accounts;

//object for move
const move = {
  NoMove: 0,
  Rock: 1,
  Paper: 2,
  Scissor: 3,
  Test: 4
};

  //set pw1
  const secret = "beer1234";
  const secret1 = "test1234";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const zero = 0;

  const SECONDS_IN_DAY = 86400

  const {toBN, toWei, toHex} = web3.utils;
  //setting up the instance
  let contractInstance;
  //Set up a new contract before each test
  beforeEach("set up conract", async () => {
    //initPlayer deploys the contract
    contractInstance = await RockPaperScissors.new({from: initPlayer});
    snapShot = await helper.takeSnapshot();
    snapshotId = snapShot['result'];
  });
  afterEach(async() => {
    await helper.revertToSnapshot(snapshotId);
  });

  //test if the internal balance starts with 0
  it('test: start balanace should be 0', async () => {
    const contractBalance = await web3.eth.getBalance(contractInstance.address);
    assert.strictEqual(contractBalance, '0',"contract balance isn't 0");

  });

  it("test: should kill the contract", async () => {
    await contractInstance.pause({from: initPlayer});
    const killObj = await contractInstance.kill({ from: initPlayer });
    const {logs} = killObj;
    const killEvent = killObj.logs[0];
    truffleAssert.eventEmitted(killObj, "LogKilled");
    assert.strictEqual(killEvent.args.initPlayer, initPlayer, "not the initPlayer");
   });

   it("test: The contract Balance is as expected, at different times", async() => {

    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);

    const initGameObject = await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    const contractBalance = await web3.eth.getBalance(contractInstance.address, initGameObject.receipt.blockNumber);
    assert.strictEqual(contractBalance.toString(), betInitPlayer.toString(),"contract balance isn't as big as the betInitPlayer's bet");

    const betChallengedPlayer = toWei("2", "Gwei");
    const acceptGameObject = await contractInstance.acceptGame(sessionID, move.Scissor ,{from: challengedPlayer, value: betChallengedPlayer});
    const contractBalance1 = await web3.eth.getBalance(contractInstance.address, acceptGameObject.receipt.blockNumber);
    //console.log(contractBalance1.toString());
    const contractBalanceCheckSum = toBN(betInitPlayer).add(toBN(betChallengedPlayer));
    assert.strictEqual(contractBalance1.toString(), contractBalanceCheckSum.toString(),"contract balance isn't as big as the sum of both players bets");
  });

  it("test: LogGameInit-event should be emitted", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    const initGameObject = await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const getBlockNumber = await web3.eth.getBlock(initGameObject.receipt.blockNumber);
    const getTime = (getBlockNumber.timestamp) + (SECONDS_IN_DAY*7);

    const {logs} = initGameObject;
    const initGameEvent = initGameObject.logs[0];
    truffleAssert.eventEmitted(initGameObject, "LogGameInit");
    assert.strictEqual(initGameEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(initGameEvent.args.sender, initPlayer, "not the initPlayer");
    assert.strictEqual(initGameEvent.args.challengedPlayer, challengedPlayer, "not the initPlayer");
    assert.strictEqual(initGameEvent.args.bet.toString(), betInitPlayer.toString(), "not the right bet of the initPlayer");
    assert.strictEqual(initGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
 });

  it("test: LogGameInit - stored values should be correct", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    const initGameObject = await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const getBlockNumber = await web3.eth.getBlock(initGameObject.receipt.blockNumber);
    const getTime = (getBlockNumber.timestamp) + (SECONDS_IN_DAY*7);

    const resultTest = await contractInstance.gameSessions(sessionID);
    assert.strictEqual(resultTest.initPlayer.toString(), initPlayer.toString(), "not the initPlayer");
    assert.strictEqual(resultTest.challengedPlayer.toString(), challengedPlayer.toString(), "not the challengedPlayer");
    assert.strictEqual(resultTest.move.toString(), move.NoMove.toString(), "not the right move");
    assert.strictEqual(resultTest.expirationTime.toString(), getTime.toString(), "expirationTime is not right");
    assert.strictEqual(resultTest.betInitPlayer.toString(), betInitPlayer.toString(), "not the right bet of the initPlayer");
    assert.strictEqual(resultTest.betChallengedPlayer.toString(), zero.toString(), "not the right bet");

  });

  it("test: LogGameAcceptance-event should be emitted", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    const betChallengedPlayer = toWei("2", "Gwei");
    const acceptGameObject = await contractInstance.acceptGame(sessionID, move.Paper ,{from: challengedPlayer, value: betChallengedPlayer});

    const getBlockNumber = await web3.eth.getBlock(acceptGameObject.receipt.blockNumber);
    const getTime = (getBlockNumber.timestamp) + (SECONDS_IN_DAY*7);

    const {logs} = acceptGameObject;
    const acceptGameEvent = acceptGameObject.logs[0];
    truffleAssert.eventEmitted(acceptGameObject, "LogGameAcceptance");
    assert.strictEqual(acceptGameEvent.args.sender, challengedPlayer, "not the challengedPlayer");
    assert.strictEqual(acceptGameEvent.args.setAmount.toString(), betChallengedPlayer.toString(), "not the right bet of the challengedPlayer");
    assert.strictEqual(acceptGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
    });

  it("test: The compiler takes care of (uint(move) <= uint(Move.scissors))", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    const betChallengedPlayer = toWei("2", "Gwei")
    await truffleAssert.fails(contractInstance.acceptGame(sessionID, move.Test ,{from: challengedPlayer, value: betChallengedPlayer}));
  });

  it("test: The storage values are right within the LogGameAcceptance-event", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    const betChallengedPlayer = toWei("2", "Gwei");
    const acceptGameObject = await contractInstance.acceptGame(sessionID, move.Paper ,{from: challengedPlayer, value: betChallengedPlayer});

    const getBlockNumber = await web3.eth.getBlock(acceptGameObject.receipt.blockNumber);
    const getTime = (getBlockNumber.timestamp) + (SECONDS_IN_DAY*7);

    const resultTest = await contractInstance.gameSessions(sessionID);
    assert.strictEqual(resultTest.initPlayer.toString(), initPlayer.toString(), "not the initPlayer");
    assert.strictEqual(resultTest.challengedPlayer.toString(), challengedPlayer.toString(), "not the challengedPlayer");
    assert.strictEqual(resultTest.move.toString(), move.Paper.toString(), "not the right move");
    assert.strictEqual(resultTest.expirationTime.toString(), getTime.toString(), "expirationTime is not right");
    assert.strictEqual(resultTest.betInitPlayer.toString(), betInitPlayer.toString(), "not the right bet of the initPlayer");
    assert.strictEqual(resultTest.betChallengedPlayer.toString(), betChallengedPlayer.toString(), "not the right bet of the challengedPlayer");
  });

  it("test: Init a game two times should not be possible", async() => {
    const betInitPlayer = toWei("1", "wei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);
    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    await truffleAssert.reverts(
      contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer}),
      "This hash was already used or it is a running game");
   });

  it("test: accept a game two times should not be possible", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});
    await truffleAssert.reverts(
      contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer}),
      "The challengedPlayer has already set a move");
   });

  it("test: LogSessionSolution-event should be emitted", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Scissor ,{from: challengedPlayer, value: betChallengedPlayer});

    const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: initPlayer});
    //the result is the
    // 0 = a tie
    // 1 = initPlayer wins
    // 2 = challengedPlayer wins
    const result = 1;
    const prize = toWei("4", "Gwei");
    const { logs } = revealSessionObject;
    const revealSessichallengedPlayervent = revealSessionObject.logs[0];
    truffleAssert.eventEmitted(revealSessionObject, "LogSessionSolution");
    assert.strictEqual(revealSessichallengedPlayervent.args.sender, initPlayer, "not the initator");
    assert.strictEqual(revealSessichallengedPlayervent.args.challengedPlayer, challengedPlayer, "not the challengedPlayer");
    assert.strictEqual(revealSessichallengedPlayervent.args.result.toString(), result.toString(), "result of the game");
    assert.strictEqual(revealSessichallengedPlayervent.args.bet.toString(), prize.toString(), "the prize is not right");
 });

  it("test: Storage should be cleared within the LogSessionSolution", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Scissor ,{from: challengedPlayer, value: betChallengedPlayer});

    const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: initPlayer});

    const storageClearedObject = await contractInstance.gameSessions(sessionID);
    assert.strictEqual(storageClearedObject.initPlayer.toString(), initPlayer.toString(), "not the initPlayer");
    assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
    assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
    assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right betInitPlayer");
    assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");
});

  it("test: LogCancelInitiator-event should be emitted", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    await helper.advanceTime(SECONDS_IN_DAY*8);
    const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: initPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),betInitPlayer.toString() , "betInitPlayer is not right");
  });

  it("test: LogCancelInitiator-event should be emitted and the storage should be cleared ", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);
    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    await helper.advanceTime(SECONDS_IN_DAY*8);
    const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: initPlayer});

    const storageClearedObject = await contractInstance.gameSessions(sessionID);
    assert.strictEqual(storageClearedObject.initPlayer.toString(), initPlayer.toString(), "not the initPlayer");
    assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
    assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
    assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right betInitPlayer");
    assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");
  });

  it("test: LogCancelInitiator-event should be emitted and the Initator get's the money of the challengedPlayer", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    await helper.advanceTime(SECONDS_IN_DAY*8);
    const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: initPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),betInitPlayer.toString() , "betInitPlayer is not right");

    const withdrawDelta = toWei("2", "Gwei");
    const balanceBefore = await web3.eth.getBalance(initPlayer, cancelObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: initPlayer});
    const {logs1} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(initPlayer, receipt.blockNumber);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");
  });

  it("test: LogCancelInitiator-event should be emitted and the Initator get's the challengedPlayer back, even if the challengedPlayer is calling the function", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: challengedPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),betInitPlayer.toString() , "betInitPlayer is not right");

    const withdrawDelta = toWei("2", "Gwei");
    const balanceBefore = await web3.eth.getBalance(initPlayer, cancelObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: initPlayer});
    const {logs1} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(initPlayer, receipt.blockNumber);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");
  });

  it("test: LogCancelChallengedPlayer-event should be emitted", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: challengedPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    const reward = toBN(betInitPlayer).add(toBN(betChallengedPlayer));
    truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),reward.toString() , "reward is not right");
    //truffleAssert.prettyPrintEmittedEvents(cancelObject);
   });

  it("test: The storage should be cleared with the LogCancelChallengedPlayer-event ", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: challengedPlayer});

    const storageClearedObject = await contractInstance.gameSessions(sessionID);
    assert.strictEqual(storageClearedObject.initPlayer.toString(), initPlayer.toString(), "not the initPlayer");
    assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
    assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
    assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right bet of the initPlayer");
    assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");
  });


  it("test: LogCancelChallengedPlayer-event should be emitted and the challengedPlayer get's the money of the initPlayer", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: challengedPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    const reward = toBN(betInitPlayer).add(toBN(betChallengedPlayer));
    truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),reward.toString() , "reward is not right");

    const withdrawDelta = toWei("4", "Gwei");
    const balanceBefore = await web3.eth.getBalance(challengedPlayer, cancelObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: challengedPlayer});
    const {logs1} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(challengedPlayer, receipt.blockNumber);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");
   });

  it("test: LogCancelChallengedPlayer-event should be emitted and the challengedPlayer get's the mchallengedPlayery back, even if the initPlayer is calling the function", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Scissor);

    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: initPlayer});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    const reward = toBN(betInitPlayer).add(toBN(betChallengedPlayer));
    truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),reward.toString() , "reward is not right");

    const withdrawDelta = toWei("4", "Gwei");
    const balanceBefore = await web3.eth.getBalance(challengedPlayer, cancelObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: challengedPlayer});
    const {logs1} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(challengedPlayer, receipt.blockNumber);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");
  });

  it("test: LogWithdraw-event should be emitted | tx fee = gasUsed x gasPrice", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);
    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Scissor ,{from: challengedPlayer, value: betChallengedPlayer});
    const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: initPlayer});
    const withdrawDelta = toWei("4", "Gwei");
    const balanceBefore = await web3.eth.getBalance(initPlayer, revealSessionObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: initPlayer});
    const {logs} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(initPlayer, receipt.getBalance);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");
  });

  it("test: If the challengedPlayer should be only allowed to set the same amount as the initplayer", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);
    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});
    const betChallengedPlayer = toWei("8", "Gwei");
    await truffleAssert.fails(contractInstance.acceptGame(sessionID, move.Scissor ,{from: challengedPlayer, value: betChallengedPlayer}));
  });

  it("test: If the result is 0, both player should get their mchallengedPlayery", async() => {
    const betInitPlayer = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(initPlayer, toHex(secret), move.Rock);
    await contractInstance.initGame(challengedPlayer, sessionID, {from: initPlayer, value: betInitPlayer});

    const betChallengedPlayer = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: challengedPlayer, value: betChallengedPlayer});
    const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: initPlayer});
     //initPlayer
    const withdrawDelta = toWei("2", "Gwei");
    const balanceBefore = await web3.eth.getBalance(initPlayer, revealSessionObject.receipt.blockNumber);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: initPlayer});
    const {logs} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, initPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(initPlayer, receipt.blockNumber);
    //test if expectedBalanceAfter == balanceAfter,
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of challengedPlayer isn't right");

    //challengedPlayer
    const balanceBefore1 = await web3.eth.getBalance(challengedPlayer, revealSessionObject.receipt.blockNumber);

    const withdrawObject1 = await contractInstance.withdraw(withdrawDelta , {from: challengedPlayer});
    const {logs1} = withdrawObject1;
    const withdrawEvent1 = withdrawObject1.logs[0];
    truffleAssert.eventEmitted(withdrawObject1, "LogWithdraw");
    assert.strictEqual(withdrawEvent1.args.sender, challengedPlayer, "initPlayer isn't right");
    assert.strictEqual(withdrawEvent1.args.amount.toString(), withdrawDelta.toString(), "not the right withdrawDelta");

    const tx1 = await web3.eth.getTransaction(withdrawObject1.tx);
    //getting the receipt for calculating gasCost
    const receipt1 = withdrawObject1.receipt;
    //calculating gasCost
    const gasCost1 = toBN(tx1.gasPrice).mul(toBN(receipt1.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter1 = toBN(balanceBefore1).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter1 = await web3.eth.getBalance(challengedPlayer, receipt1.blockNumber);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter1.toString(), balanceAfter1.toString(), "Balance of challengedPlayer isn't right");
  });
});

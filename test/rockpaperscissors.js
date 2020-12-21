const RockPaperScissors = artifacts.require("RockPaperScissors.sol");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
const helper = require('ganache-time-traveler');


contract('RockPaperScissors', (accounts) => {


  //setting up five accounts
  const [owner, one, two, three, four] = accounts;

  //object for move
  const move = {
    NoMove: 0,
    Rock: 1,
    Paper: 2,
    Scissor: 3
  };

  //set pw1
  const secret = "beer1234";
  const secret1 = "test1234";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const zero = 0;

  const SECONDS_IN_DAY = 86400
  const maxGameTime = 604800;

  const {toBN, toWei, toHex} = web3.utils;
  //setting up the instance
  let contractInstance;
  //Set up a new contract before each test
  beforeEach("set up conract", async () => {
    //owner deploys the contract
    contractInstance = await RockPaperScissors.new({from: owner});
  });

  //test if the internal balance starts with 0
  it('test: start balanace should be 0', async () => {
      const contractBalance = await web3.eth.getBalance(contractInstance.address);
      assert.strictEqual(contractBalance, '0',"contract balance isn't 0");

  });

  it("test: should kill the contract", async () => {
    await contractInstance.pause({from: owner});
    const killObj = await contractInstance.kill({ from: owner });
    const {logs} = killObj;
    const killEvent = killObj.logs[0];
    truffleAssert.eventEmitted(killObj, "LogKilled");
    assert.strictEqual(killEvent.args.owner, owner, "not the owner");
   });

  it("test: LogGameInit-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   const initGameObject = await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

   const getBlock = await web3.eth.getBlock(initGameObject.receipt.blockNumber);
   const getTime = (getBlock.timestamp) + (maxGameTime);

   const {logs} = initGameObject;
   const initGameEvent = initGameObject.logs[0];
   truffleAssert.eventEmitted(initGameObject, "LogGameInit");
   assert.strictEqual(initGameEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(initGameEvent.args.sender, owner, "not the owner");
   assert.strictEqual(initGameEvent.args.challengedPlayer, one, "not the owner");
   assert.strictEqual(initGameEvent.args.bet.toString(), amount.toString(), "not the owner");
   assert.strictEqual(initGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
 });

  it("test: LogGameInit-event should be emitted and the stored values should be correct", async() => {
  const amount = toWei("2", "Gwei");
  const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

  const initGameObject = await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

  const getBlock = await web3.eth.getBlock(initGameObject.receipt.blockNumber);
  const getTime = (getBlock.timestamp) + (maxGameTime);

  const {logs} = initGameObject;
  const initGameEvent = initGameObject.logs[0];
  truffleAssert.eventEmitted(initGameObject, "LogGameInit");
  assert.strictEqual(initGameEvent.args.sessionID, sessionID, "wrong ID");
  assert.strictEqual(initGameEvent.args.sender, owner, "not the owner");
  assert.strictEqual(initGameEvent.args.challengedPlayer, one, "not the challengedPlayer");
  assert.strictEqual(initGameEvent.args.bet.toString(), amount.toString(), "not the right amount");
  assert.strictEqual(initGameEvent.args.expirationTime.toString(), getTime.toString(), "expirationTime is not right");

  const resultTest = await contractInstance.gameSessions(sessionID);
  assert.strictEqual(resultTest.initPlayer.toString(), owner.toString(), "not the owner");
  assert.strictEqual(resultTest.challengedPlayer.toString(), one.toString(), "not the challengedPlayer");
  assert.strictEqual(resultTest.move.toString(), move.NoMove.toString(), "not the right move");
  assert.strictEqual(resultTest.expirationTime.toString(), getTime.toString(), "expirationTime is not right");
  assert.strictEqual(resultTest.betInitPlayer.toString(), amount.toString(), "not the right amount");
  assert.strictEqual(resultTest.betChallengedPlayer.toString(), zero.toString(), "not the right bet");

  });

  it("test: LogGameAcceptance-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});
   const amount1 = toWei("2", "Gwei");
   const acceptGameObject = await contractInstance.acceptGame(sessionID, move.Paper ,{from: one, value: amount1});

   const getBlock = await web3.eth.getBlock(acceptGameObject.receipt.blockNumber);
   const getTime = (getBlock.timestamp) + (maxGameTime);

   const {logs} = acceptGameObject;
   const acceptGameEvent = acceptGameObject.logs[0];
   truffleAssert.eventEmitted(acceptGameObject, "LogGameAcceptance");
   assert.strictEqual(acceptGameEvent.args.sender, one, "not the challengedPlayer");
   assert.strictEqual(acceptGameEvent.args.setAmount.toString(), amount1.toString(), "not the owner");
   assert.strictEqual(acceptGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
   //truffleAssert.prettyPrintEmittedEvents(acceptGameObject);
  });

  it("test: Init a game two times should not be possible", async() => {
    const amount = toWei("1", "wei");
    const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

    await contractInstance.initGame(one, sessionID, {from: owner, value: amount});


    await truffleAssert.reverts(
      contractInstance.initGame(one, sessionID, {from: owner, value: amount}),
      "This hash was already used or it is a running game");
   });

  it("test: accept a game two times should not be possible", async() => {
    const amount = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

    await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

    const amount1 = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});
    await truffleAssert.reverts(
      contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1}),
      "The challengedPlayer has already set a move");
   });

  it("test: LogSessionSolution-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Rock);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

   const amount1 = toWei("2", "Gwei");
   await contractInstance.acceptGame(sessionID, move.Scissor ,{from: one, value: amount1});

   const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: owner});
   const result = 1;
   const amount2 = toWei("4", "Gwei");
   const { logs } = revealSessionObject;
   const revealSessionEvent = revealSessionObject.logs[0];
   truffleAssert.eventEmitted(revealSessionObject, "LogSessionSolution");
   assert.strictEqual(revealSessionEvent.args.sender, owner, "not the initator");
   assert.strictEqual(revealSessionEvent.args.challengedPlayer, one, "not the challengedPlayer");
   assert.strictEqual(revealSessionEvent.args.result.toString(), result.toString(), "result of the game");
   assert.strictEqual(revealSessionEvent.args.bet.toString(), amount2.toString(), "latestBlock is not right");

 });

  it("test: LogSessionSolution-event should be emitted and the storage should be cleared", async() => {
  const amount = toWei("2", "Gwei");
  const sessionID = await contractInstance.hash(owner, toHex(secret), move.Rock);

  await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

  const amount1 = toWei("2", "Gwei");
  await contractInstance.acceptGame(sessionID, move.Scissor ,{from: one, value: amount1});

  const revealSessionObject = await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: owner});
  const result = 1;
  const amount2 = toWei("4", "Gwei");
  const {logs} = revealSessionObject;
  const revealSessionEvent = revealSessionObject.logs[0];
  truffleAssert.eventEmitted(revealSessionObject, "LogSessionSolution");
  assert.strictEqual(revealSessionEvent.args.sender, owner, "not the initator");
  assert.strictEqual(revealSessionEvent.args.challengedPlayer, one, "not the challengedPlayer");
  assert.strictEqual(revealSessionEvent.args.result.toString(), result.toString(), "result of the game");
  assert.strictEqual(revealSessionEvent.args.bet.toString(), amount2.toString(), "latestBlock is not right");

  const storageClearedObject = await contractInstance.gameSessions(sessionID);
  assert.strictEqual(storageClearedObject.initPlayer.toString(), owner.toString(), "not the owner");
  assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
  assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
  assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right amount");
  assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");

});

  it("test: LogCancelInitiator-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});
   await helper.advanceTime(SECONDS_IN_DAY*8);
   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: owner});
   const {logs} = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");
  });

  it("test: LogCancelInitiator-event should be emitted and the storage should be cleared ", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});
   await helper.advanceTime(SECONDS_IN_DAY*8);
   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: owner});
   const {logs} = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");

   const storageClearedObject = await contractInstance.gameSessions(sessionID);
   assert.strictEqual(storageClearedObject.initPlayer.toString(), owner.toString(), "not the owner");
   assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
   assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
   assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right amount");
   assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");

  });

  it("test: LogCancelInitiator-event should be emitted and the Initator get's the money back", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});
   await helper.advanceTime(SECONDS_IN_DAY*8);

   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: owner});
   const {logs} = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");

   const withdrawDelta = toWei("2", "Gwei");
   const balanceBefore = await web3.eth.getBalance(owner);

   const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: owner});
   const {logs1} = withdrawObject;
   const withdrawEvent = withdrawObject.logs[0];
   truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
   assert.strictEqual(withdrawEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

   const tx = await web3.eth.getTransaction(withdrawObject.tx);
   //getting the receipt for calculating gasCost
   const receipt = withdrawObject.receipt;
   //calculating gasCost
   const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
   //calculating expectetbalanceafter
   const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
   //getting the balance after withdraw
   const balanceAfter = await web3.eth.getBalance(owner);
   //test if expectedBalanceAfter == balanceAfter
   assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


   //
  });

  it("test: LogCancelInitiator-event should be emitted and the Initator get's the money back, even if the challengedPlayer is calling the function", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});
   await helper.advanceTime(SECONDS_IN_DAY*8);

   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: one});
   const {logs} = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, one, "owner isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");

   const withdrawDelta = toWei("2", "Gwei");
   const balanceBefore = await web3.eth.getBalance(owner);

   const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: owner});
   const {logs1} = withdrawObject;
   const withdrawEvent = withdrawObject.logs[0];
   truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
   assert.strictEqual(withdrawEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

   const tx = await web3.eth.getTransaction(withdrawObject.tx);
   //getting the receipt for calculating gasCost
   const receipt = withdrawObject.receipt;
   //calculating gasCost
   const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
   //calculating expectetbalanceafter
   const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
   //getting the balance after withdraw
   const balanceAfter = await web3.eth.getBalance(owner);
   //test if expectedBalanceAfter == balanceAfter
   assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


   //
  });

  it("test: LogCancelChallengedPlayer-event should be emitted", async() => {
    const amount = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

    await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

    const amount1 = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: one});
    const {logs} = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    const sum = toBN(amount).add(toBN(amount1));
    truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, one, "owner isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");
    //truffleAssert.prettyPrintEmittedEvents(cancelObject);
   });

  it("test: LogCancelChallengedPlayer-event should be emitted and the storage should be cleared ", async() => {
     const amount = toWei("2", "Gwei");
     const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

     await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

     const amount1 = toWei("2", "Gwei");
     await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});

     await helper.advanceTime(SECONDS_IN_DAY*8);

     const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: one});
     const {logs} = cancelObject;
     const cancelEvent = cancelObject.logs[0];
     const sum = toBN(amount).add(toBN(amount1));
     truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
     assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
     assert.strictEqual(cancelEvent.args.sender, one, "owner isn't right");
     assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");

     const storageClearedObject = await contractInstance.gameSessions(sessionID);
     assert.strictEqual(storageClearedObject.initPlayer.toString(), owner.toString(), "not the owner");
     assert.strictEqual(storageClearedObject.challengedPlayer.toString(), zeroAddress.toString(), "not the challengedPlayer");
     assert.strictEqual(storageClearedObject.move.toString(), zero.toString(), "not the right move");
     assert.strictEqual(storageClearedObject.betInitPlayer.toString(), zero.toString(), "not the right amount");
     assert.strictEqual(storageClearedObject.betChallengedPlayer.toString(), zero.toString(), "not the right bet");

    });

  it("test: LogCancelChallengedPlayer-event should be emitted and the challengedPlayer get's the money back", async() => {
     const amount = toWei("2", "Gwei");
     const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

     await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

     const amount1 = toWei("2", "Gwei");
     await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});

     await helper.advanceTime(SECONDS_IN_DAY*8);

     const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: one});
     const {logs} = cancelObject;
     const cancelEvent = cancelObject.logs[0];
     const sum = toBN(amount).add(toBN(amount1));
     truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
     assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
     assert.strictEqual(cancelEvent.args.sender, one, "owner isn't right");
     assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");

     const withdrawDelta = toWei("4", "Gwei");
     const balanceBefore = await web3.eth.getBalance(one);

     const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: one});
     const {logs1} = withdrawObject;
     const withdrawEvent = withdrawObject.logs[0];
     truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
     assert.strictEqual(withdrawEvent.args.sender, one, "owner isn't right");
     assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

     const tx = await web3.eth.getTransaction(withdrawObject.tx);
     //getting the receipt for calculating gasCost
     const receipt = withdrawObject.receipt;
     //calculating gasCost
     const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
     //calculating expectetbalanceafter
     const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
     //getting the balance after withdraw
     const balanceAfter = await web3.eth.getBalance(one);
     //test if expectedBalanceAfter == balanceAfter
     assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


    //
   });

  it("test: LogCancelChallengedPlayer-event should be emitted and the challengedPlayer get's the money back, even if the initPlayer is calling the function", async() => {
      const amount = toWei("2", "Gwei");
      const sessionID = await contractInstance.hash(owner, toHex(secret), move.Scissor);

      await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

      const amount1 = toWei("2", "Gwei");
      await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});

      await helper.advanceTime(SECONDS_IN_DAY*8);

      const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: owner});
      const {logs} = cancelObject;
      const cancelEvent = cancelObject.logs[0];
      const sum = toBN(amount).add(toBN(amount1));
      truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
      assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
      assert.strictEqual(cancelEvent.args.sender, owner, "owner isn't right");
      assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");

      const withdrawDelta = toWei("4", "Gwei");
      const balanceBefore = await web3.eth.getBalance(one);

      const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: one});
      const {logs1} = withdrawObject;
      const withdrawEvent = withdrawObject.logs[0];
      truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
      assert.strictEqual(withdrawEvent.args.sender, one, "owner isn't right");
      assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

      const tx = await web3.eth.getTransaction(withdrawObject.tx);
      //getting the receipt for calculating gasCost
      const receipt = withdrawObject.receipt;
      //calculating gasCost
      const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
      //calculating expectetbalanceafter
      const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
      //getting the balance after withdraw
      const balanceAfter = await web3.eth.getBalance(one);
      //test if expectedBalanceAfter == balanceAfter
      assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


     //
    });

  it("test: LogWithdraw-event should be emitted | tx fee = gasUsed x gasPrice", async() => {
    const amount = toWei("2", "Gwei");
    const sessionID = await contractInstance.hash(owner, toHex(secret), move.Rock);
    await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

    const amount1 = toWei("2", "Gwei");
    await contractInstance.acceptGame(sessionID, move.Scissor ,{from: one, value: amount1});
    await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: owner});
    const withdrawDelta = toWei("4", "Gwei");
    const balanceBefore = await web3.eth.getBalance(owner);

    const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: owner});
    const {logs} = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, owner, "owner isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(owner);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


     });

     it("test: If the challengedPlayer sets more than the initPlayer, the winner takes all of the insert", async() => {
       const amount = toWei("2", "Gwei");
       const sessionID = await contractInstance.hash(owner, toHex(secret), move.Rock);
       await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

       const amount1 = toWei("8", "Gwei");
       await contractInstance.acceptGame(sessionID, move.Scissor ,{from: one, value: amount1});
       await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: owner});
       const withdrawDelta = toWei("10", "Gwei");
       const balanceBefore = await web3.eth.getBalance(owner);

       const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: owner});
       const {logs} = withdrawObject;
       const withdrawEvent = withdrawObject.logs[0];
       truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
       assert.strictEqual(withdrawEvent.args.sender, owner, "owner isn't right");
       assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

       const tx = await web3.eth.getTransaction(withdrawObject.tx);
       //getting the receipt for calculating gasCost
       const receipt = withdrawObject.receipt;
       //calculating gasCost
       const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
       //calculating expectetbalanceafter
       const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("10", "Gwei"))).sub(toBN(gasCost));
       //getting the balance after withdraw
       const balanceAfter = await web3.eth.getBalance(owner);
       //test if expectedBalanceAfter == balanceAfter
       assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


        });

  it("test: If the result is 0, both player should get their money", async() => {
   const amount = toWei("2", "Gwei");
   const sessionID = await contractInstance.hash(owner, toHex(secret), move.Rock);
   await contractInstance.initGame(one, sessionID, {from: owner, value: amount});

   const amount1 = toWei("2", "Gwei");
   await contractInstance.acceptGame(sessionID, move.Rock ,{from: one, value: amount1});
   await contractInstance.revealSessionSolution(web3.utils.toHex(secret), move.Rock, {from: owner});

   //initPlayer
   const withdrawDelta = toWei("2", "Gwei");
   const balanceBefore = await web3.eth.getBalance(owner);

   const withdrawObject = await contractInstance.withdraw(withdrawDelta , {from: owner});
   const {logs} = withdrawObject;
   const withdrawEvent = withdrawObject.logs[0];
   truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
   assert.strictEqual(withdrawEvent.args.sender, owner, "owner isn't right");
   assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawDelta.toString(), "hash problem");

   const tx = await web3.eth.getTransaction(withdrawObject.tx);
   //getting the receipt for calculating gasCost
   const receipt = withdrawObject.receipt;
   //calculating gasCost
   const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
   //calculating expectetbalanceafter
   const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
   //getting the balance after withdraw
   const balanceAfter = await web3.eth.getBalance(owner);
   //test if expectedBalanceAfter == balanceAfter
   assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");

   //challengedPlayer
   const balanceBefore1 = await web3.eth.getBalance(one);

   const withdrawObject1 = await contractInstance.withdraw(withdrawDelta , {from: one});
   const {logs1} = withdrawObject1;
   const withdrawEvent1 = withdrawObject1.logs[0];
   truffleAssert.eventEmitted(withdrawObject1, "LogWithdraw");
   assert.strictEqual(withdrawEvent1.args.sender, one, "owner isn't right");
   assert.strictEqual(withdrawEvent1.args.amount.toString(), withdrawDelta.toString(), "hash problem");

   const tx1 = await web3.eth.getTransaction(withdrawObject1.tx);
   //getting the receipt for calculating gasCost
   const receipt1 = withdrawObject1.receipt;
   //calculating gasCost
   const gasCost1 = toBN(tx1.gasPrice).mul(toBN(receipt1.gasUsed));
   //calculating expectetbalanceafter
   const expectedBalanceAfter1 = toBN(balanceBefore1).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
   //getting the balance after withdraw
   const balanceAfter1 = await web3.eth.getBalance(one);
   //test if expectedBalanceAfter == balanceAfter
   assert.strictEqual(expectedBalanceAfter1.toString(), balanceAfter1.toString(), "Balance of one isn't right");

    });
});

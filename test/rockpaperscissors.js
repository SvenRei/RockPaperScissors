const RockPaperScissors = artifacts.require("RockPaperScissors.sol");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
const helper = require('ganache-time-traveler');



contract('RockPaperScissors', (accounts) => {
  //setting up the instance
  let contractInstance;

  //setting up three accounts
  const [sender, one, two, three, four] = accounts;

  //set pw1
  const secret = "beer1234";
  const secret1 = "test1234";
  // build up a new RPS contract before each test
  const SECONDS_IN_DAY = 86400

  const { toBN, toWei } = web3.utils;

  //Set up a new contract before each test
  beforeEach("set up conract", async () => {
    //sender deploys the contract
    contractInstance =  await RockPaperScissors.new({from: sender});
  });

  //test if the internal balance starts with 0
  it('test: start balanace should be 0', async () => {
      const contractBalance = await web3.eth.getBalance(contractInstance.address);
      assert.strictEqual(contractBalance, '0',"contract balance isn't 0");

  });

  it("test: should kill the contract", async () => {
    await contractInstance._pause({from: sender});
    const killObj = await contractInstance.kill({ from: sender });
    const { logs } = killObj;
    const killEvent = killObj.logs[0];
    truffleAssert.eventEmitted(killObj, "LogKilled");
    assert.strictEqual(killEvent.args.sender, sender, "not the owner");
   });

  it("test: LogGameInit-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 3;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 604800;
   const initGameObject = await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

   const tx = await web3.eth.getTransaction(initGameObject.tx);
   const getBlock = await web3.eth.getBlock(tx.blockNumber);
   const getTime = (getBlock.timestamp) + (maxGameTime);
   /*
   const getBlock = await web3.eth.getBlock('latest');
   const getTime = (getBlock.timestamp) + (maxGameTime); //get time + maxGameTime for checking LogDeploy-event
   */

   const { logs } = initGameObject;
   const initGameEvent = initGameObject.logs[0];
   truffleAssert.eventEmitted(initGameObject, "LogGameInit");
   assert.strictEqual(initGameEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(initGameEvent.args.sender, sender, "not the owner");
   assert.strictEqual(initGameEvent.args.challengedPlayer, one, "not the owner");
   assert.strictEqual(initGameEvent.args.bet.toString(), amount.toString(), "not the owner");
   assert.strictEqual(initGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
 });

  it("test: LogGameAcceptance-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 3;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 604800;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});
   const amount1 = toWei("2", "Gwei");
   const move1 =2;
   const acceptGameObject = await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

   const tx = await web3.eth.getTransaction(acceptGameObject.tx);
   const getBlock = await web3.eth.getBlock(tx.blockNumber);
   const getTime = (getBlock.timestamp) + (maxGameTime);

   const { logs } = acceptGameObject;
   const acceptGameEvent = acceptGameObject.logs[0];
   truffleAssert.eventEmitted(acceptGameObject, "LogGameAcceptance");
   assert.strictEqual(acceptGameEvent.args.sender, one, "not the challengedPlayer");
   assert.strictEqual(acceptGameEvent.args.setAmount.toString(), amount1.toString(), "not the owner");
   assert.strictEqual(acceptGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
   //truffleAssert.prettyPrintEmittedEvents(acceptGameObject);
  });

  it("test: Init a game two times should not be possible", async() => {
    const amount = toWei("2", "Gwei");
    const move = 3;
    const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
    const maxGameTime = 604800;

    await contractInstance.initGame(one, sessionID, {from: sender, value: amount});


    await truffleAssert.reverts(
      contractInstance.initGame(one, sessionID, {from: sender, value: amount}),
      "This hash was already used or it is a running game");
   });

  it("test: accept a game two times should not be possible", async() => {
    const amount = toWei("2", "Gwei");
    const move = 3;
    const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
    const maxGameTime = 7 * 86400 / 15;

    await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

    const amount1 = toWei("2", "Gwei");
    const move1 =2;
    await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});
    await truffleAssert.reverts(
      contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1}),
      "The challengedPlayer has already set a move");
   });

  it("test: LogSessionSolution-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 1;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 7 * 86400 / 15;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

   const amount1 = toWei("2", "Gwei");
   const move1 =3;
   await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

   const revealSessionObject = await contractInstance.revealSessionSolution(sessionID, web3.utils.toHex(secret), move, {from: sender});
   const result = 1;
   const amount2 = toWei("4", "Gwei");
   const { logs } = revealSessionObject;
   const revealSessionEvent = revealSessionObject.logs[0];
   truffleAssert.eventEmitted(revealSessionObject, "LogSessionSolution");
   assert.strictEqual(revealSessionEvent.args.sender, sender, "not the initator");
   assert.strictEqual(revealSessionEvent.args.challengedPlayer, one, "not the challengedPlayer");
   assert.strictEqual(revealSessionEvent.args.result.toString(), result.toString(), "result of the game");
   assert.strictEqual(revealSessionEvent.args.bet.toString(), amount2.toString(), "latestBlock is not right");

   //truffleAssert.prettyPrintEmittedEvents(revealSessionObject);
 });

  it("test: LogCancelInitiator-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 3;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 604800;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});


   await helper.advanceTime(SECONDS_IN_DAY*8);

   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: sender});
   const { logs } = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, sender, "sender isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");


   //
  });

  it("test: LogCancelInitiator-event should be emitted and the Initator get's the money back", async() => {
   const amount = toWei("2", "Gwei");
   const move = 3;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 604800;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

   await helper.advanceTime(SECONDS_IN_DAY*8);

   const cancelObject = await contractInstance.cancelSessionInitiator(sessionID , {from: sender});
   const { logs } = cancelObject;
   const cancelEvent = cancelObject.logs[0];
   truffleAssert.eventEmitted(cancelObject, "LogCancelInitator");
   assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
   assert.strictEqual(cancelEvent.args.sender, sender, "sender isn't right");
   assert.strictEqual(cancelEvent.args.bet.toString(),amount.toString() , "amount is not right");

   const withdrawAmount = toWei("2", "Gwei");
   const balanceBefore = await web3.eth.getBalance(sender);

   const withdrawObject = await contractInstance.withdraw(withdrawAmount , {from: sender});
   const { logs1 } = withdrawObject;
   const withdrawEvent = withdrawObject.logs[0];
   truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
   assert.strictEqual(withdrawEvent.args.sender, sender, "sender isn't right");
   assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawAmount.toString(), "hash problem");

   const tx = await web3.eth.getTransaction(withdrawObject.tx);
   //getting the receipt for calculating gasCost
   const receipt = withdrawObject.receipt;
   //calculating gasCost
   const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
   //calculating expectetbalanceafter
   const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("2", "Gwei"))).sub(toBN(gasCost));
   //getting the balance after withdraw
   const balanceAfter = await web3.eth.getBalance(sender);
   //test if expectedBalanceAfter == balanceAfter
   assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


   //
  });

  it("test: LogCancelChallengedPlayer-event should be emitted", async() => {
    const amount = toWei("2", "Gwei");
    const move = 3;
    const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
    const maxGameTime = 7 * 86400 / 15;

    await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

    const amount1 = toWei("2", "Gwei");
    const move1 =1;
    await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

    await helper.advanceTime(SECONDS_IN_DAY*8);

    const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: one});
    const { logs } = cancelObject;
    const cancelEvent = cancelObject.logs[0];
    const sum = toBN(amount).add(toBN(amount1));
    truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
    assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
    assert.strictEqual(cancelEvent.args.sender, one, "sender isn't right");
    assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");
    //truffleAssert.prettyPrintEmittedEvents(cancelObject);
   });

  it("test: LogCancelChallengedPlayer-event should be emitted and the challengedPlayer get's the money back", async() => {
     const amount = toWei("2", "Gwei");
     const move = 3;
     const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
     const maxGameTime = 7 * 86400 / 15;

     await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

     const amount1 = toWei("2", "Gwei");
     const move1 =1;
     await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

     await helper.advanceTime(SECONDS_IN_DAY*8);

     const cancelObject = await contractInstance.cancelSessionChallengedPlayer(sessionID , {from: one});
     const { logs } = cancelObject;
     const cancelEvent = cancelObject.logs[0];
     const sum = toBN(amount).add(toBN(amount1));
     truffleAssert.eventEmitted(cancelObject, "LogCancelChallengedPlayer");
     assert.strictEqual(cancelEvent.args.sessionID, sessionID, "wrong ID");
     assert.strictEqual(cancelEvent.args.sender, one, "sender isn't right");
     assert.strictEqual(cancelEvent.args.bet.toString(),sum.toString() , "amount is not right");

     const withdrawAmount = toWei("4", "Gwei");
     const balanceBefore = await web3.eth.getBalance(one);

     const withdrawObject = await contractInstance.withdraw(withdrawAmount , {from: one});
     const { logs1 } = withdrawObject;
     const withdrawEvent = withdrawObject.logs[0];
     truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
     assert.strictEqual(withdrawEvent.args.sender, one, "sender isn't right");
     assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawAmount.toString(), "hash problem");

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
    const move = 1;
    const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
    const maxGameTime = 7 * 86400 / 15;
    await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

    const amount1 = toWei("2", "Gwei");
    const move1 =3;
    await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});
    await contractInstance.revealSessionSolution(sessionID, web3.utils.toHex(secret), move, {from: sender});
    const withdrawAmount = toWei("4", "Gwei");
    const balanceBefore = await web3.eth.getBalance(sender);

    const withdrawObject = await contractInstance.withdraw(withdrawAmount , {from: sender});
    const { logs } = withdrawObject;
    const withdrawEvent = withdrawObject.logs[0];
    truffleAssert.eventEmitted(withdrawObject, "LogWithdraw");
    assert.strictEqual(withdrawEvent.args.sender, sender, "sender isn't right");
    assert.strictEqual(withdrawEvent.args.amount.toString(), withdrawAmount.toString(), "hash problem");

    const tx = await web3.eth.getTransaction(withdrawObject.tx);
    //getting the receipt for calculating gasCost
    const receipt = withdrawObject.receipt;
    //calculating gasCost
    const gasCost = toBN(tx.gasPrice).mul(toBN(receipt.gasUsed));
    //calculating expectetbalanceafter
    const expectedBalanceAfter = toBN(balanceBefore).add(toBN(toWei("4", "Gwei"))).sub(toBN(gasCost));
    //getting the balance after withdraw
    const balanceAfter = await web3.eth.getBalance(sender);
    //test if expectedBalanceAfter == balanceAfter
    assert.strictEqual(expectedBalanceAfter.toString(), balanceAfter.toString(), "Balance of one isn't right");


     });

});

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
  // build up a new Splitter contract before each test
  const SECONDS_IN_DAY = 86400

  const { toBN } = web3.utils;
  const { toWei } = web3.utils;

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
    await contractInstance.pause({from: sender});
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
   const maxGameTime = 7 * 86400 / 15;
   const initGameObject = await contractInstance.initGame(one, sessionID, {from: sender, value: amount});
   const getBlock = await web3.eth.getBlock('latest');
   const getTime = getBlock.timestamp + maxGameTime; //get time + maxGameTime for checking LogDeploy-event


   const { logs } = initGameObject;
   const initGameEvent = initGameObject.logs[0];
   truffleAssert.eventEmitted(initGameObject, "LogGameInit");
   assert.strictEqual(initGameEvent.args.sender, sender, "not the owner");
   assert.strictEqual(initGameEvent.args.challengedPlayer, one, "not the owner");
   assert.strictEqual(initGameEvent.args.bet.toString(), amount.toString(), "not the owner");
   assert.strictEqual(initGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
 });

 it("test: LogGameAcceptance-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 3;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 7 * 86400 / 15;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

   const amount1 = toWei("2", "Gwei");
   const move1 =2;
   const acceptGameObject = await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

   const getBlock = await web3.eth.getBlock('latest');
   const getTime = getBlock.timestamp + maxGameTime; //get time + maxGameTime for checking LogDeploy-event


   const { logs } = acceptGameObject;
   const acceptGameEvent = acceptGameObject.logs[0];
   truffleAssert.eventEmitted(acceptGameObject, "LogGameAcceptance");
   assert.strictEqual(acceptGameEvent.args.sender, one, "not the challengedPlayer");
   assert.strictEqual(acceptGameEvent.args.setAmount.toString(), amount1.toString(), "not the owner");
   assert.strictEqual(acceptGameEvent.args.expirationTime.toString(), getTime.toString(), "latestBlock is not right");
  });

  it("test: LogSessionSolution-event should be emitted", async() => {
   const amount = toWei("2", "Gwei");
   const move = 1;
   const sessionID = await contractInstance.hash(web3.utils.toHex(secret), move);
   const maxGameTime = 7 * 86400 / 15;

   await contractInstance.initGame(one, sessionID, {from: sender, value: amount});

   const amount1 = toWei("2", "Gwei");
   const move1 =1;
   await contractInstance.acceptGame(sessionID, move1 ,{from: one, value: amount1});

   const revealSessionObject = await contractInstance.revealSessionSolution(sessionID, web3.utils.toHex(secret), move, {from: sender});
   const result = 0;
   const amount2 = toWei("4", "Gwei");
   const { logs } = revealSessionObject;
   const revealSessionEvent = revealSessionObject.logs[0];
   truffleAssert.eventEmitted(revealSessionObject, "LogSessionSolution");
   assert.strictEqual(revealSessionEvent.args.sender, sender, "not the initator");
   assert.strictEqual(revealSessionEvent.args.challengedPlayer, one, "not the challengedPlayer");
   assert.strictEqual(revealSessionEvent.args.result.toString(), result.toString(), "result of the game");
   assert.strictEqual(revealSessionEvent.args.bet.toString(), amount2.toString(), "latestBlock is not right");
 });
});

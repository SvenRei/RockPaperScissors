  pragma solidity ^0.5.8;

//for´killing
import "./Killable.sol";
//using openzeppelin
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract RockPaperScissors is Killable{

      /*
      The concept for "hiding" the moves looks like this:

      The first player hashes his move along with a secret, the address from the contract, and his address. (like in the remittance project)
      This hash is assumed to be the hash of the game session. Then the "challengedPlayer" can make his move if he knows the SessionID.
      Then the initiator of the game can reveal the result because he enters the same data into the "revealSessionSolution" function as in the hash function.
      Within this function, it is checked if the generated hash is the same as the sessionID.  If they are the same the result is announced and the winner gets the bet.
      The winner can partially withdraw this prize.
    */

    using SafeMath for uint;

        uint constant maxGameTime = 7 * 1 days / 15; //this is the max period!

    //enumerate the possible moves of the game
    //https://solidity.readthedocs.io/en/v0.5.3/types.html#enums
    enum Move{
      noMove, //for waiting after setting up the game
      rock,
      paper,
      scissors
    }

    //struct for setting the data
    //at the moment they can bet every amount they want
    struct GameSession {
      address initPlayer;
      address challengedPlayer;
      Move move;
      uint expirationTime;
      uint betInitPlayer;
      uint betChallengedPlayer;
    }

    //Set up events
    event LogGameInit(address indexed sender, address indexed challengedPlayer, uint bet, uint expirationTime);
    event LogGameAcceptance(address indexed sender, uint setAmount, uint expirationTime);
    event LogCancelInitator(address indexed sender, bytes32 hash, uint bet);
    event LogCancelChallengedPlayer(address indexed sender, bytes32 hash, uint bet);
    event LogSessionSolution(address indexed sender, address indexed challengedPlayer, uint result, uint bet);
    event LogWithdraw(address indexed sender, uint amount);

    //setting up mappings
    mapping(bytes32 => GameSession) public gameSessions; //gameSession --> sessionID
    mapping(address => uint) public balances;

    constructor() public{
    }

  //hash like in remittance
  //hash a secret, a move, the sender and the contract address
  function hash(bytes32 secret, Move move) public view returns(bytes32 sessionID){
    require(secret != bytes32(0), "cannot be 0");
    require((uint(move) > uint(Move.noMove) && (uint(move) <= uint(Move.scissors))), "input == 0 || input > 3");
    sessionID = keccak256(abi.encodePacked(msg.sender, secret, move, address(this)));
  }
  //a function to get the winner of the game
  // Rock = 1
  // Paper = 2
  // Scissors = 3

  //getting the winner of the game || At this and the following points I had big problems with enum, because the data format did not really fit..
  function getWinner(Move firstMove, Move secondMove) public pure returns (uint result){

    if(firstMove == secondMove) return 0;

    if((uint(firstMove) == uint(Move.rock) && uint(secondMove) == uint(Move.scissors)) ||
       (uint(firstMove) == uint(Move.paper) && uint(secondMove) == uint(Move.rock)) ||
       (uint(firstMove) == uint(Move.scissors) && uint(secondMove) == uint(Move.paper))) return 1;

    if((uint(firstMove) == uint(Move.rock) && uint(secondMove) == uint(Move.paper)) ||
       (uint(firstMove) == uint(Move.paper) && uint(secondMove) == uint(Move.scissors)) ||
       (uint(firstMove) == uint(Move.scissors) && uint(secondMove) == uint(Move.rock))) return 2;
  }

  //function to initialize the game with the challenged Player and the set move! The move is set, because of the hash!
  function initGame(address challengedPlayer, bytes32 sessionID) public payable {
    //using the storage // https://medium.com/cryptologic/memory-and-storage-in-solidity-4052c788ca86
    GameSession storage session = gameSessions[sessionID];
    //getting bet
    uint amount = msg.value;
    //set the requirements
    require(sessionID != bytes32(0), "cannot be 0");
    require(msg.sender != session.initPlayer, "This hash was already used or it is a running game");
    require(challengedPlayer != address(0), "cannot be zero");
    require(challengedPlayer != msg.sender, "cannot be the sender");

    uint expirationTime = now.add(maxGameTime); //for Setting the right period!
    //saving data into storage
    session.initPlayer = msg.sender;
    session.challengedPlayer = challengedPlayer;
    session.betInitPlayer = amount;
    session.expirationTime = expirationTime;
    //event
    emit LogGameInit(msg.sender, challengedPlayer ,amount, expirationTime);
  }

  //the challengedplayer can accept the game, if he knows the sessionID.
  //the challengedPlayer has to set his move
  function acceptGame(bytes32 sessionID, Move move) public payable {
    //getting bet
    uint amount = msg.value;
    //requirements for the acceptance
    require(sessionID != bytes32(0), "cannot be zero");
    require((uint(move) > uint(Move.noMove)) && (uint(move) <= uint(Move.scissors)), "input == 0 || input > 2");
    GameSession storage session = gameSessions[sessionID];
    //check if the session has expired
    require(now < session.expirationTime, "session has expired");
    require(session.move == Move.noMove, "The challengedPlayer already set a move");
    uint expirationTime = now.add(maxGameTime); //for Setting the right period!
    session.move = move;
    session.betChallengedPlayer = session.betChallengedPlayer.add(msg.value);
    session.expirationTime = expirationTime;
    //event
    emit LogGameAcceptance(msg.sender, amount, expirationTime);
  }
  //function to let the initator cancel the session
  function cancelSessionInitiator(bytes32 sessionID) public whenAlive {
    GameSession storage session = gameSessions[sessionID];
    address initPlayer = session.initPlayer;
    //both participants can cancel the session
    require(initPlayer == msg.sender, "session can only be cancelled by the initator");
    require(session.expirationTime < now, "time-window to set a move for the challengedPlayer has exceeded");
    balances[msg.sender] = balances[msg.sender].add(session.betInitPlayer).add(session.betChallengedPlayer);
    emit LogCancelInitator(msg.sender, sessionID, balances[msg.sender]);

    //setting everything to 0, exept for the init.player
    session.challengedPlayer = address(0x0);
    session.betInitPlayer = 0;
    session.betChallengedPlayer = 0;
    session.move = Move.noMove;
  }
  function cancelSessionChallengedPlayer(bytes32 sessionID) public whenAlive {
    GameSession storage session = gameSessions[sessionID];
    address challengedPlayer = session.challengedPlayer;
    require(challengedPlayer == msg.sender, "session can only be cancelled by the challengedPlayer");
    require(session.move != Move.noMove, "challengedPlayer has not yet carried out a move");
    require(session.expirationTime < now, "time to reveal the session-solution has exceeded");
    balances[msg.sender] = balances[msg.sender].add(session.betInitPlayer).add(session.betChallengedPlayer);
    emit LogCancelChallengedPlayer(msg.sender, sessionID, balances[msg.sender]);

    //setting everything to 0, exept for the init.player
    session.challengedPlayer = address(0x0);
    session.betInitPlayer = 0;
    session.betChallengedPlayer = 0;
    session.move = Move.noMove;

  }
  //function to let the challengedPlayer cancel
  //reveal the solution. This function can only be called by the initiator
  function revealSessionSolution(bytes32 sessionID, bytes32 secret, Move move) public payable whenAlive {
    GameSession storage session = gameSessions[sessionID];
    require(sessionID != bytes32(0), "cannot be zero");
    require(session.initPlayer == msg.sender, "is not the initator");
    require(session.move != Move.noMove, "challengedPlayer has not yet carried out a move");
    //check if the sessionID and the password and move are matching
    require(sessionID == hash(secret, move), "not match");
    //get the winner through the getWinner-function
    uint result = getWinner(move, session.move);
    //getting the bet out of storage
    uint bet = session.betInitPlayer + session.betChallengedPlayer;
    address challengedPlayer = session.challengedPlayer;
    if(result == 0){
            balances[msg.sender] = balances[msg.sender].add(session.betInitPlayer);
            balances[challengedPlayer] = balances[challengedPlayer].add(session.betChallengedPlayer);
    } else if  (result == 1) {
      balances[msg.sender] = balances[msg.sender].add(bet);
    } else if (result == 2) {
      balances[challengedPlayer] = balances[challengedPlayer].add(bet);
    }

    //setting everything to 0, exept for the init.player
    session.challengedPlayer = address(0x0);
    session.betInitPlayer = 0;
    session.betChallengedPlayer = 0;
    session.move = Move.noMove;

    emit LogSessionSolution(msg.sender, challengedPlayer, result, bet);

  }
  //withdraw like in remittance
  function withdraw(uint withdrawAmount) public {
       require(withdrawAmount > 0, "A higher balance than zero, is a prerequisite");
       require(withdrawAmount <= balances[msg.sender], "amount > balance[msg.sender]");
       emit LogWithdraw(msg.sender, withdrawAmount);
       balances[msg.sender] = balances[msg.sender] - withdrawAmount;
       //transferring the money to the accounts
       (bool success, ) = msg.sender.call.value(withdrawAmount)("");
       require(success, "Transfer failed");
 }

}

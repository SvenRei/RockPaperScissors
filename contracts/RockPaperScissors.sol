  pragma solidity ^0.6.0;

//for´killing
import "./Killable.sol";
//using openzeppelin
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract RockPaperScissors is Killable{

  using SafeMath for uint;

      uint constant maxGameTime = 7 days; //this is the max period!

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
  event LogGameInit(bytes32 sessionID, address indexed sender, address indexed challengedPlayer, uint bet, uint expirationTime);
  event LogGameAcceptance(bytes32 sessionID, address indexed sender, uint setAmount, uint expirationTime);
  event LogCancelInitator(bytes32 sessionID, address indexed sender, uint bet);
  event LogCancelChallengedPlayer(bytes32 sessionID, address indexed sender, uint bet);
  event LogSessionSolution(bytes32 sessionID, address indexed sender, address indexed challengedPlayer, uint result, uint bet);
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
    require((uint(move) > uint(Move.noMove)), "no valid move");
    sessionID = keccak256(abi.encodePacked(secret, move, address(this)));
  }

  function checkHash(bytes32 sessionID, bytes32 secret, Move move) public view returns(bytes32 correctHash){
    correctHash = hash(secret, move);
    require(sessionID == correctHash, "the data entered do not match");
    return correctHash;
  }
  //msg.sender,
  //a function to get the winner of the game
  // Rock = 1
  // Paper = 2
  // Scissors = 3
  function getWinner(Move firstMove, Move secondMove) public pure returns (uint result){
    //https://stackoverflow.com/questions/26436657/rock-paper-scissors-in-java-using-modulus
    result = (3 + uint(firstMove) - uint(secondMove) ) % 3 ;
  }

  //function to initialize the game with the challenged Player and the set move! The move is set, because of the hash!
  function initGame(address challengedPlayer, bytes32 sessionID) public payable whenNotPaused {

    require(sessionID != bytes32(0), "The sessionID can't be zero");
    //using the storage // https://medium.com/cryptologic/memory-and-storage-in-solidity-4052c788ca86
    GameSession storage session = gameSessions[sessionID];
    require(session.initPlayer == address(0), "This hash was already used or it is a running game");
    require(challengedPlayer != address(0), "The address of the challengedPlayer can't be 0");
    require(challengedPlayer != msg.sender, "The challengedPlayer can't be the initator");

    uint expirationTime = now.add(maxGameTime); //for Setting the right period!
    //saving data into storage
    session.initPlayer = msg.sender;
    session.challengedPlayer = challengedPlayer;
    session.betInitPlayer = msg.value;
    session.expirationTime = expirationTime;
    //event
    emit LogGameInit(sessionID, msg.sender, challengedPlayer ,msg.value, expirationTime);
  }

  //the challengedplayer can accept the game, if he knows the sessionID.
  //the challengedPlayer has to set his move
  function acceptGame(bytes32 sessionID, Move move) public payable {
    //requirements for the acceptance
    //require(sessionID != bytes32(0), "The sessionID can't be zero");
    require((uint(move) > uint(Move.noMove)) && (uint(move) <= uint(Move.scissors)), "input == 0 || input > 2");
    GameSession storage session = gameSessions[sessionID];
    require(session.move == Move.noMove, "The challengedPlayer has already set a move");
    uint expirationTime = now.add(maxGameTime); //for Setting the right period!
    session.move = move;
    session.betChallengedPlayer = msg.value;
    session.expirationTime = expirationTime;
    //event
    emit LogGameAcceptance(sessionID, msg.sender, msg.value, expirationTime);
  }
  //function to let the initator cancel the session
  function cancelSessionInitiator(bytes32 sessionID) public whenAlive {
    GameSession storage session = gameSessions[sessionID];
    address initPlayer = session.initPlayer;

    //require(initPlayer == msg.sender, "session can only be cancelled by the initator");
    require(session.expirationTime < now, "time-window to set a move for the challengedPlayer has exceeded");
    balances[msg.sender] = balances[msg.sender].add(session.betInitPlayer).add(session.betChallengedPlayer);
    emit LogCancelInitator(sessionID, msg.sender , balances[msg.sender]);

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
    require(session.expirationTime <= now, "time to reveal the session-solution has exceeded");
    balances[msg.sender] = balances[msg.sender].add(session.betInitPlayer).add(session.betChallengedPlayer);
    emit LogCancelChallengedPlayer(sessionID, msg.sender, balances[msg.sender]);

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
    require(sessionID == checkHash(sessionID, secret, move), "The input values do not result in the SessionID");
    require(session.initPlayer == msg.sender, "is not the initator");
    require(session.move != Move.noMove, "challengedPlayer has not yet carried out a move");

    //get the winner through the getWinner-function
    uint result = getWinner(move, session.move);
    //getting the bet out of storage
    uint betInitPlayer = session.betInitPlayer;
    uint betChallengedPlayer = session.betChallengedPlayer;
    uint bet = (betInitPlayer).add(betChallengedPlayer);
    address challengedPlayer = session.challengedPlayer;
    if(result == 0){
            balances[msg.sender] = balances[msg.sender].add(betInitPlayer);
            balances[challengedPlayer] = balances[challengedPlayer].add(betChallengedPlayer);
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

    emit LogSessionSolution(sessionID, msg.sender, challengedPlayer, result, bet);

  }
  //withdraw like in remittance
  function withdraw(uint withdrawBalance) public {
       require(withdrawBalance > 0, "A higher balance than zero, is a prerequisite");
       require(withdrawBalance <= balances[msg.sender], "amount > balance[msg.sender]");
       emit LogWithdraw(msg.sender, withdrawBalance);
       balances[msg.sender] = balances[msg.sender] - withdrawBalance;
       //transferring the money to the accounts
       (bool success, ) = msg.sender.call.value(withdrawBalance)("");
       require(success, "Transfer failed");
 }

}

pragma solidity ^0.6.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

contract Killable is Ownable, Pausable{

     bool private killed;

    event LogKilled(address indexed sender);
    event LogRefunds(address indexed sender, uint refunds);

    modifier whenAlive{
        require(!killed, "isKilled");
        _;
    }

    modifier whenKilled{
        require(killed, "isAlive");
        _;
    }

    function isKilled() public view returns(bool _killed) {
        return killed;
    }

    function kill() public onlyOwner whenAlive whenPaused {
        killed = true;
        emit LogKilled(msg.sender);
    }

    //https://solidity.readthedocs.io/en/v0.5.3/security-considerations.html#security-considerations
    function safeFunds() external onlyOwner whenKilled{
        require(address(this).balance != 0, "the balance of the contract can't be zero");
        emit LogRefunds(msg.sender, address(this).balance);
        msg.sender.transfer(address(this).balance);
    }
}

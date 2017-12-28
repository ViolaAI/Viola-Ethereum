pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/ERC20.sol';
import '../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';
import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract ViolaCrowdSale is Ownable {
  using SafeMath for uint256;

  enum State { Preparing, NotStarted, Active, Refunding, Ended, Stopped }

  // The token being sold
  ERC20 public myToken;

  //To tie different address to same customer
  bool public requireCustomerId;

  //For whitelisted
  mapping(address=>uint) public addressCap;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // how many token units a buyer gets per wei
  uint256 public rate;

  // amount of raised money in wei
  uint256 public weiRaised;

  // when to refresh cap
  uint public capRefreshPeriod = 86400;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function ViolaCrowdSale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet) public {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(_wallet != address(0));

    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
  }

  function setToken(address _tokenAddress) onlyOwner external {
    require(address(myToken) == address(0));    
        myToken = ERC20(_tokenAddress);
    }

  function setWhitelistAddress( address _user, uint _cap ) onlyOwner external {
        addressCap[_user] = _cap;
        //add event
    }

  function getAddressCap( address _user ) constant public returns(uint) {
        uint cap = addressCap[_user];
        if (cap > 0) {
          return cap;
        }
    }

  // fallback function can be used to buy tokens
  function () external payable {
    buyTokens(msg.sender);
  }

  function startCrowdSale() external {
    require(myToken != address(0));
    startTime = now;
    endTime = now + (86400 * 20); //20 days
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable {
    require(addressCap[msg.sender] > 0);
    require(myToken != address(0));
    require(beneficiary != address(0));
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    assignTokens(beneficiary,tokens);

    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal view returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public view returns (bool) {
    return now > endTime;
  }

  function getTokensLeft() public constant returns (uint) {
    return myToken.allowance(owner, this);
  }
  function assignTokens(address receiver, uint tokenAmount) internal {
     require(myToken.transferFrom(owner, receiver, tokenAmount));
  }
  function isCrowdsaleFull() public constant returns (bool) {
    return getTokensLeft() == 0;
  }
}

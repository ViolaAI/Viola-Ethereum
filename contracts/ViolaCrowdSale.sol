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
contract ViolaCrowdsale is Ownable {
  using SafeMath for uint256;

  enum State { Preparing, NotStarted, Active, Paused, Ended, Stopped }

  //Status of contract
  State public status;

  // The token being sold
  ERC20 public myToken;

  //For whitelisted
  mapping(address=>uint) public maxBuyCap;

  mapping(address=>uint) public investedSum;

  mapping(address=>uint) public tokensAllocated;

  mapping(address=>uint) public bonusTokensAllocated;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // how many token units a buyer gets per eth
  uint256 public rate;

  uint public bonusTokenRate;

  // amount of raised money in wei
  uint256 public weiRaised;

  uint256 public totalTokensAllocated;

  // when to refresh cap
  uint public capRefreshPeriod = 86400;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   * @param bonusAmount bonus amount of token allocated
   */
  event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount, uint256 bonusAmount);


  function ViolaCrowdale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _bonusRate, address _wallet) public {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(_wallet != address(0));

    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
<<<<<<< HEAD
    bonusTokenRate = _bonusRate;
=======
    status = State.Preparing;
  }

  // Crowdsale lifecycle
  function startCrowdSale() onlyOwner external {
    require(myToken != address(0));
    require(status == State.NotStarted);
    
    startTime = now;
    endTime = now + (86400 * 20); //20 days

    status = State.Active;
  }

  function endCrowdSale() onlyOwner external {
    require(status == State.Active);

    status = State.Ended;
  }

  function pauseCrowdSale() onlyOwner external {
    require(status == State.Active);

    status = State.Paused;
  }

  function unpauseCrowdSale() onlyOwner external {
    require(status == State.Paused);

    status = State.Active;
  }

  function stopCrowdSale() onlyOwner external {
    require(status == State.Active);

    status = State.Stopped;
>>>>>>> e4187dce0d72f4dfbae10b6108beb2048fb0432b
  }

  function setToken(address _tokenAddress) onlyOwner external {
    require(status == State.Preparing);
    require(address(_tokenAddress) != address(0));
        
    myToken = ERC20(_tokenAddress);

    status = State.NotStarted;
  }

<<<<<<< HEAD
  function setBonusRate(uint _bonusRate) onlyOwner external {
    require(address(_bonusRate) > 0);    
        bonusTokenRate = _bonusRate;
    }

  function setWhitelistAddress( address _investor, uint _cap ) onlyOwner external {
        maxBuyCap[_investor] = _cap;
        //add event
    }

  function getAddressCap( address _user ) constant public returns(uint) {
        uint cap = maxBuyCap[_user];
        if (cap > 0) {
          return cap;
        }
=======
  function setWhitelistAddress( address _user, uint _cap ) onlyOwner external {
    require(_cap > 0);
    require(_user != address(0));

    addressCap[_user] = _cap;
  }

  function setRate(uint _rate) onlyOwner external {
    require(_rate > 0);

    rate = _rate;
  }

  function getAddressCap( address _user ) constant public returns(uint) {
    require(_user != address(0));

    uint cap = addressCap[_user];
    if (cap > 0) {
      return cap;
>>>>>>> e4187dce0d72f4dfbae10b6108beb2048fb0432b
    }
  }

  // fallback function can be used to buy tokens
  function () external payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
<<<<<<< HEAD
  function buyTokens(address investor) public payable {
    //require(tx.gasprice <= 50000000 wei);
    
=======
  function buyTokens(address beneficiary) public payable {
    require(status == State.Active);
    require(addressCap[msg.sender] > 0);
>>>>>>> e4187dce0d72f4dfbae10b6108beb2048fb0432b
    require(myToken != address(0));
    require(validPurchase());

    uint weiAmount = msg.value;

    checkCapAndRecord(investor,weiAmount);

    allocateToken(investor,weiAmount);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    forwardFunds();
  }

  function checkCapAndRecord(address investor, uint weiAmount) internal {
      uint remaindingCap = maxBuyCap[investor];
      require(remaindingCap > weiAmount);
      maxBuyCap[investor] = remaindingCap.sub(weiAmount);
      investedSum[investor] = investedSum[investor].add(weiAmount);
  }

    function allocateToken(address investor, uint weiAmount) internal {
        // calculate token amount to be created
        uint tokens = weiAmount.mul(rate);
        uint bonusTokens = weiAmount.mul(bonusTokenRate);
        
        uint tokensToAllocate = tokens.add(bonusTokens);
        
        require(getTokensLeft() > tokensToAllocate);
        totalTokensAllocated = totalTokensAllocated.add(tokensToAllocate);

        //assignTokens(investor,tokens);

        tokensAllocated[investor] = tokens;
        bonusTokensAllocated[investor] = bonusTokens;

        TokenPurchase(investor, weiAmount, tokens, bonusTokens);
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
    return myToken.allowance(owner, this).sub(totalTokensAllocated);
  }

  function assignTokens(address receiver, uint tokenAmount) internal {
     require(myToken.transferFrom(owner, receiver, tokenAmount));
  }

  function getAddressAllocatedTokens(address investor) public constant returns(uint) {
    return tokensAllocated[investor];
  }

  function getAddressBonusAllocatedTokens(address investor) public constant returns(uint) {
    return bonusTokensAllocated[investor];
  }

  function getAddressAmtInvested(address investor) public constant returns(uint) {
    return investedSum[investor];
  }

  function emergencyERC20Drain( ERC20 token, uint amount ) external onlyOwner {
        token.transfer(owner,amount);
    }
}

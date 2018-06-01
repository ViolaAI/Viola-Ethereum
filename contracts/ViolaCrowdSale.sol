pragma solidity 0.4.23;

import './VLTToken.sol';
import '../node_modules/zeppelin-solidity/contracts/token/ERC20.sol';
import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title ViolaCrowdsale
 * A backend process reserves token to the `receive` wallet of the user when ETH is received
 * Funds will be forwarded after the end of crowdsale. Tokens will be distributable 7 days after crowdsale ends.
 */
 
contract ViolaCrowdsale is Ownable {
  using SafeMath for uint256;

  enum State { Deployed, PendingStart, Active, Paused, Ended, Completed }

  // Status of token sale
  State public status = State.Deployed;

  // The token being sold
  VLTToken public violaToken;

  // Addresses with passed KYC
  mapping(address=>bool) public addressKYC;

  // Addresses with failed KYC
  mapping(address=>bool) public addressFailedKYC;

  // Total wei sum an address has invested
  mapping(address=>uint) public investedSum;

  // Total VAI tokens an address purchased via BTC/ETH is allocated
  mapping(address=>uint) public tokensAllocated;

  // Total VAI tokens an address purchased via FIAT is allocated
  mapping(address=>uint) public externalTokensAllocated;

  // Total bonus VAI tokens an address purchased via BTC/ETH is entitled after vesting
  mapping(address=>uint) public bonusTokensAllocated;

  // Total bonus VAI tokens an address purchased via FIAT is entitled after vesting
  mapping(address=>uint) public externalBonusTokensAllocated;

  // Allocation ID's that has been catered for to prevent double allocations
  mapping(uint=>bool) public hasAllocatedInID;

  // Start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;
  uint256 public bonusVestingPeriod = 60 days;

  /**
   * Note all values are calculated in wei(uint256) including token amount
   * 1 ether = 1000000000000000000 wei
   * 1 violet = 1000000000000000000 vi lawei
   */

  // Address where funds are collected
  address public wallet;

  // Min amount investor can purchase
  uint256 public minWeiToPurchase;

  // Max amount investor can purchase (global max cap) - default 100 ETH
  uint256 public maxWeiToPurchase = 100000000000000000000;

  // how many token units *in wei* a buyer gets *per wei*
  uint256 public rate;

  // Extra bonus token to give *in percentage*
  uint public bonusTokenRateLevelOne = 25; // 2 days
  uint public bonusTokenRateLevelTwo = 20; // 5 days
  uint public bonusTokenRateLevelThree = 15; // 10 days
  uint public bonusTokenRateLevelFour = 10; // 13 days

  // Total amount of tokens allocated for crowdsale
  uint256 public totalTokensAllocated;

  // Total amount of tokens reserved from external sources
  // Sub set of totalTokensAllocated ( totalTokensAllocated - totalReservedTokenAllocated = total tokens allocated for purchases using ether )
  uint256 public totalReservedTokenAllocated;

  // Numbers of token left above 0 to still be considered sold
  uint256 public leftoverTokensBuffer;

  /**
   * event for front end logging
  */
  event TokenPurchase(address indexed purchaser, uint256 value, uint256 rate, uint256 amount, uint256 bonusAmount);
  event TokenAllocated(address indexed tokenReceiver, uint256 amount, uint256 bonusAmount);
  event ExternalTokenPurchase(address indexed purchaser, uint256 amount, uint256 bonusAmount);
  event ExternalPurchaseRefunded(address indexed purchaser, uint256 amount, uint256 bonusAmount);
  event TokenDistributed(address indexed tokenReceiver, uint256 tokenAmount);
  event CrowdsalePending();
  event CrowdsaleStarted();
  event CrowdsaleEnded();
  event BonusRateChanged();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  // Set inital arguments of the crowdsale
  function initialiseCrowdsale (uint256 _startTime, uint256 _rate, address _tokenAddress, address _wallet) onlyOwner external {
    require(status == State.Deployed);
    require(_startTime >= now);
    require(_rate > 0);
    require(address(_tokenAddress) != address(0));
    require(_wallet != address(0));

    startTime = _startTime;
    endTime = _startTime + 30 days;
    rate = _rate;
    wallet = _wallet;
    violaToken = VLTToken(_tokenAddress);

    status = State.PendingStart;

    emit CrowdsalePending();
  }

  /**
   * Crowdsale state functions
   * To track state of current crowdsale
   */

  // To be called by Ethereum alarm clock or anyone
  // Can only be called successfully when time is valid
  function startCrowdsale() external {
    require(withinPeriod());
    require(violaToken != address(0));
    require(getTokensLeft() > 0);
    require(status == State.PendingStart);

    status = State.Active;

    emit CrowdsaleStarted();
  }

  // To be called by owner or contract
  // Ends the crowdsale when tokens are sold out
  function endCrowdsale() public {
    if (!tokensHasSoldOut()) {
      require(msg.sender == owner);
    }
    require(status == State.Active);

    bonusVestingPeriod = now + 60 days;

    status = State.Ended;

    emit CrowdsaleEnded();
  }

  // Emergency pause
  function pauseCrowdsale() onlyOwner external {
    require(status == State.Active);

    status = State.Paused;
  }

  // Resume paused crowdsale
  function unpauseCrowdsale() onlyOwner external {
    require(status == State.Paused);

    status = State.Active;
  }

  function completeCrowdsale() onlyOwner external {
    require(hasEnded());
    require(violaToken.allowance(owner, this) == 0);
    
    status = State.Completed;

    // send ether to the fund collection wallet
    wallet.transfer(address(this).balance);
    
    assert(address(this).balance == 0);
  }

  function burnExtraTokens() onlyOwner external {
    require(hasEnded());
    uint256 extraTokensToBurn = violaToken.allowance(owner, this);
    violaToken.burnFrom(owner, extraTokensToBurn);
    assert(violaToken.allowance(owner, this) == 0);
  }

  /**
   * Setter functions for crowdsale parameters
   * Only owner can set values
   */
  function setLeftoverTokensBuffer(uint256 _tokenBuffer) onlyOwner external {
    require(_tokenBuffer > 0);
    require(getTokensLeft() >= _tokenBuffer);
    leftoverTokensBuffer = _tokenBuffer;
  }

  // Set the ether to token rate
  function setRate(uint _rate) onlyOwner external {
    require(_rate > 0);
    rate = _rate;
  }

  function setBonusTokenRateLevelOne(uint _rate) onlyOwner external {
    bonusTokenRateLevelOne = _rate;
    emit BonusRateChanged();
  }

  function setBonusTokenRateLevelTwo(uint _rate) onlyOwner external {
    bonusTokenRateLevelTwo = _rate;
    emit BonusRateChanged();
  }

  function setBonusTokenRateLevelThree(uint _rate) onlyOwner external {
    bonusTokenRateLevelThree = _rate;
    emit BonusRateChanged();
  }
  function setBonusTokenRateLevelFour(uint _rate) onlyOwner external {
    bonusTokenRateLevelFour = _rate;
    emit BonusRateChanged();
  }

  function setCapWeiToPurchase(uint256 _minWeiToPurchase, uint256 _maxWeiToPurchase) onlyOwner external {
    require(_minWeiToPurchase < _maxWeiToPurchase);
    minWeiToPurchase = _minWeiToPurchase;
    maxWeiToPurchase = _maxWeiToPurchase;
  }

  /**
   * Getter functions for crowdsale parameters
   * Does not use gas
   */

  //Checks if token has been sold out
  function tokensHasSoldOut() view internal returns (bool) {
    if (getTokensLeft() <= leftoverTokensBuffer) {
      return true;
    } else {
      return false;
    }
  }

  // @return true if the transaction can buy tokens
  function withinPeriod() public view returns (bool) {
    return now >= startTime && now <= endTime;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public view returns (bool) {
    if (status == State.Ended) {
      return true;
    }
    return now > endTime;
  }

  function getTokensLeft() public view returns (uint) {
    return violaToken.allowance(owner, this).sub(totalTokensAllocated);
  }

  function transferTokens (address receiver, uint tokenAmount) internal {
     require(violaToken.transferFrom(owner, receiver, tokenAmount));
  }

  function getTimeBasedBonusRate() public view returns(uint) {
    bool bonusDuration1 = now >= startTime && now <= (startTime + 2 days);  // Day 1-2 (2 days)
    bool bonusDuration2 = now > (startTime + 2 days) && now <= (startTime + 7 days); // Day 3-7 (5 days)
    bool bonusDuration3 = now > (startTime + 7 days) && now <= (startTime + 17 days); // Day 8-17 (10 days)
    bool bonusDuration4 = now > (startTime + 17 days) && now <= endTime; // Day 18 to end (13 days or less)

    if (bonusDuration1) {
      return bonusTokenRateLevelOne;
    } else if (bonusDuration2) {
      return bonusTokenRateLevelTwo;
    } else if (bonusDuration3) {
      return bonusTokenRateLevelThree;
    } else if (bonusDuration4) {
      return bonusTokenRateLevelFour;
    } else {
      return 0;
    }
  }

  function getTotalTokensByAddress(address _investor) public view returns(uint) {
    return getTotalNormalTokensByAddress(_investor).add(getTotalBonusTokensByAddress(_investor));
  }

  function getTotalNormalTokensByAddress(address _investor) public view returns(uint) {
    return tokensAllocated[_investor].add(externalTokensAllocated[_investor]);
  }

  function getTotalBonusTokensByAddress(address _investor) public view returns(uint) {
    return bonusTokensAllocated[_investor].add(externalBonusTokensAllocated[_investor]);
  }

  /**
   * Functions to handle buy tokens
   * Fallback function as entry point for eth
   */

  // Called when ether is sent to contract
  function () external payable {
    buyTokens(msg.sender);
  }

  // Used to buy tokens
  function buyTokens(address _from) internal {
    require(status == State.Active);
    
    uint weiAmount = msg.value;

    // contribution must be within min and not more than max allowed
    require(weiAmount >= minWeiToPurchase); 
    require(weiAmount <= maxWeiToPurchase);

    // Track invested amount of investor
    investedSum[_from] = investedSum[_from].add(weiAmount);

    // Get bonus rate applied
    uint256 appliedRate = getTimeBasedBonusRate();

    // calculate token amount to be allocated
    uint tokens = weiAmount.mul(rate);
    uint bonusTokens = tokens.mul(appliedRate).div(100);

    // send purchase event to backend to trigger allocateTokens to the correct receiving address
    emit TokenPurchase(_from, weiAmount, appliedRate, tokens, bonusTokens);
  }

  // Backend calls this to allocate tokens to an ETH or BTC buyer's receiving address in the DB
  function allocateTokens(address _receive, uint256 _tokens, uint256 _bonusTokens, uint256 _allocateID) onlyOwner external {
    require(_tokens > 0);
    require(hasAllocatedInID[_allocateID] == false);
    
    uint256 tokensToAllocate = _tokens.add(_bonusTokens);
    
    require(getTokensLeft() >= tokensToAllocate);
    totalTokensAllocated = totalTokensAllocated.add(tokensToAllocate);

    tokensAllocated[_receive] = tokensAllocated[_receive].add(_tokens);
    bonusTokensAllocated[_receive] = bonusTokensAllocated[_receive].add(_bonusTokens);

    hasAllocatedInID[_allocateID] = true;

    if (tokensHasSoldOut()) {
      endCrowdsale();
    }
    emit TokenAllocated(_receive,  _tokens, _bonusTokens);
  }

  // Backend calls this to allocate tokens to a FIAT buyer's receiving address in the DB
  function externalPurchaseTokens(address _investor, uint256 _amount, uint256 _bonusAmount, uint256 _allocateID) onlyOwner external {
    require(_amount > 0);
    require(hasAllocatedInID[_allocateID] == false);

    uint256 totalTokensToAllocate = _amount.add(_bonusAmount);

    require(getTokensLeft() >= totalTokensToAllocate);
    totalTokensAllocated = totalTokensAllocated.add(totalTokensToAllocate);
    totalReservedTokenAllocated = totalReservedTokenAllocated.add(totalTokensToAllocate);

    externalTokensAllocated[_investor] = externalTokensAllocated[_investor].add(_amount);
    externalBonusTokensAllocated[_investor] = externalBonusTokensAllocated[_investor].add(_bonusAmount);

    hasAllocatedInID[_allocateID] = true;
    
    if (tokensHasSoldOut()) {
      endCrowdsale();
    }
    emit ExternalTokenPurchase(_investor,  _amount, _bonusAmount);
  }

  /**
   * Functions for refunds & claim tokens
   * 
   */

  // Refund users in case of unsuccessful kyc
  function _refund(address _investor) internal {
    uint256 investedAmt = investedSum[_investor];
    require(investedAmt > 0);

    uint totalInvestorTokens = tokensAllocated[_investor].add(bonusTokensAllocated[_investor]);

    if (status == State.Active) {
      //Refunded tokens go back to sale pool
      totalTokensAllocated = totalTokensAllocated.sub(totalInvestorTokens);
    }

    // Set token allocation to 0
    tokensAllocated[_investor] = 0;
    bonusTokensAllocated[_investor] = 0;

    // Set invested sum to 0 before transferring
    investedSum[_investor] = 0;

    // Transfer the refund amount
    _investor.transfer(investedAmt);

    emit Refunded(_investor, investedAmt);
  }

  // Called when KYC is rejected to refund the user and de-allocate tokens
  function rejectKYC(address _from, address _receive) onlyOwner external {
    require(_from != address(0));
    require(_receive != address(0));

    // Allow refund only when tokens are not yet distributed
    require(addressKYC[_receive] == false);

    addressFailedKYC[_receive] = true;
    uint256 weiAmount = investedSum[_from];

    if (weiAmount > 0) {
      _refund(_from);
    }
  }

  // Used by owner to distribute paid tokens from ETH and BTC buyers (non-bonus) to approved KYC users
  function distributeTokens(address _receive) onlyOwner external {
    require(hasEnded());
    require(_receive != address(0));

    // Record KYC Status of investor to `approved`
    addressKYC[_receive] = true;

    uint256 tokensToClaim = tokensAllocated[_receive];

    require(tokensToClaim > 0);
    tokensAllocated[_receive] = 0;

    // Transfer allocated tokens to the receiving address
    transferTokens(_receive, tokensToClaim);

    emit TokenDistributed(_receive, tokensToClaim); 
  }

  // Used by owner to distribute paid tokens from FIAT buyers (non-bonus) to approved KYC users
  function distributeExternalTokens(address _receive) onlyOwner external {
    require(hasEnded());
    require(_receive != address(0));

    // Record KYC Status of investor to approved
    addressKYC[_receive] = true;

    uint256 tokensToClaim = externalTokensAllocated[_receive];

    require(tokensToClaim > 0);
    externalTokensAllocated[_receive] = 0;

    // Transfer allocated tokens to the receiving address
    transferTokens(_receive, tokensToClaim);

    emit TokenDistributed(_receive, tokensToClaim); 
  }

  // Distribute bonus tokens from ETH / BTC purchase
  function distributeBonusTokens(address _receive) onlyOwner external {
    require(hasEnded());
    require(now >= bonusVestingPeriod);

    uint tokensToClaim = bonusTokensAllocated[_receive];

    require(tokensToClaim > 0);
    bonusTokensAllocated[_receive] = 0;

    transferTokens(_receive, tokensToClaim);

    emit TokenDistributed(_receive, tokensToClaim);
  }

  // Distribute bonus tokens from FIAT purchase
  function distributeExternalBonusTokens(address _receive) onlyOwner external {
    require(hasEnded());
    require(now >= bonusVestingPeriod);

    uint tokensToClaim = externalBonusTokensAllocated[_receive];

    require(tokensToClaim > 0);
    externalBonusTokensAllocated[_receive] = 0;

    transferTokens(_receive, tokensToClaim);

    emit TokenDistributed(_receive, tokensToClaim);
  }

  // Refund allocated tokens from FIAT contributors
  function refundExternalPurchase(address _investor) onlyOwner external {
    require(_investor != address(0));
    require(externalTokensAllocated[_investor] > 0);

    uint externalTokens = externalTokensAllocated[_investor];
    uint externalBonusTokens = externalBonusTokensAllocated[_investor];

    externalTokensAllocated[_investor] = 0;
    externalBonusTokensAllocated[_investor] = 0;

    uint totalInvestorTokens = externalTokens.add(externalBonusTokens);

    totalReservedTokenAllocated = totalReservedTokenAllocated.sub(totalInvestorTokens);
    totalTokensAllocated = totalTokensAllocated.sub(totalInvestorTokens);

    emit ExternalPurchaseRefunded(_investor,externalTokens, externalBonusTokens);
  }

  //For cases where token are mistakenly sent / airdrops
  function emergencyERC20Drain( ERC20 token, uint amount ) external onlyOwner {
    require(status == State.Completed);
    token.transfer(owner,amount);
  }

}
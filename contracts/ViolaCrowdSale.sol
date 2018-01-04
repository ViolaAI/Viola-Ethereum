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

  enum State { Deployed, PendingStart, Active, Paused, Ended, Completed }

  //Status of contract
  State public status = State.Deployed;

  // The token being sold
  ERC20 public violaToken;

  //For keeping track of whitelist address. cap >0 = whitelisted
  mapping(address=>uint) public maxBuyCap;

  //Total wei sum an address has invested
  mapping(address=>uint) public investedSum;

  //Total violaToken an address is allocated
  mapping(address=>uint) public tokensAllocated;

  //Total bonus violaToken an address is entitled after vesting
  mapping(address=>uint) public bonusTokensAllocated;

  //Start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;
  uint256 public bonusVestingPeriod = 180 days;

  //Address where funds are collected
  address public wallet;

  //Min amount investor can purchase
  uint256 public minWeiToPurchase;

  // how many token units a buyer gets per eth
  uint256 public rate;

  // how many bonus token units a buyer gets per eth
  uint public bonusTokenRate;

  //Extra bonus token to give *per ETH*
  uint[] bonusTokenRateByLevels = [30, 15, 8];

  // amount of raised money in wei
  uint256 public weiRaised;

  //Total amount of tokens allocated for crowdsale
  uint256 public totalTokensAllocated;

  //Total amount of tokens reserved from external sources
  //Sub set of totalTokensAllocated ( totalTokensAllocated - totalReservedTokenAllocated = total tokens allocated for purchases using ether )
  uint256 public totalReservedTokenAllocated;

  uint256 public leftoverTokensBuffer;

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
  event ExternalTokenPurchase(address indexed purchaser, uint256 amount, uint256 bonusAmount);
  event TokenDistributed(address indexed tokenReceiver, uint256 tokenAmount);
  event BonusTokenDistributed(address indexed tokenReceiver, uint256 tokenAmount);
  event CrowdsalePending();
  event CrowdsaleStarted();
  event CrowdsaleEnded();
  event BonusRateChanged();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  //Set inital arguments of the crowdsale
  function initaliseCrowdsale (uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _bonusRate, address _tokenAddress, address _wallet) onlyOwner external {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(_bonusRate > 0);
    require(address(_tokenAddress) != address(0));
    require(_wallet != address(0));

    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
    bonusTokenRate = _bonusRate;
    violaToken = ERC20(_tokenAddress);

    status = State.PendingStart;

    CrowdsalePending();
  }

  // To be called by Ethereum alarm clock
  function startCrowdSale() external {
    require(withinPeriod());
    require(violaToken != address(0));
    require(status == State.PendingStart);

    status = State.Active;

    CrowdsaleStarted();
  }

  //To be called by owner or contract
  //Ends the crowdsale when tokens are sold out
  function endCrowdSale() public {
    if (!tokensHasSoldOut()) {
      require(msg.sender == owner);
    }
    require(status == State.Active);

    status = State.Ended;

    CrowdsaleEnded();
  }
  //Emergency pause
  function pauseCrowdSale() onlyOwner external {
    require(status == State.Active);

    status = State.Paused;
  }
  //Resume paused crowdsale
  function unpauseCrowdSale() onlyOwner external {
    require(status == State.Paused);

    status = State.Active;
  }

  function completeCrowdSale() onlyOwner external {
    require(status == State.Ended);

    status = State.Completed;

    forwardFunds();
  }

  //Set the number of bonus token per ether
  function setBonusRate(uint _bonusRate) onlyOwner external {
    require(_bonusRate > 0);
    bonusTokenRate = _bonusRate;
    }

  //Add the address to whitelist
  function setWhitelistAddress( address _investor, uint _cap ) onlyOwner external {
        require(_cap > 0);
        require(_investor != address(0));
        maxBuyCap[_investor] = _cap;
        //add event
    }

  //Remove the address from whitelist
  function removeWhitelistAddress(address _investor) onlyOwner external {
    require(_investor != address(0));
    
    maxBuyCap[_investor] = 0;
    uint256 weiAmount = investedSum[_investor];

    if (weiAmount > 0) {
      refund(_investor);
    }
  }

  //Get max wei an address can buy up to
  function getAddressCap( address _user ) view public returns(uint) {
        uint cap = maxBuyCap[_user];
        if (cap > 0) {
          return cap;
        }
  }

  //Set the ether to token rate
  function setRate(uint _rate) onlyOwner external {
    require(_rate > 0);
    rate = _rate;
  }

  function setMinWeiToPurchase(uint _minWeiToPurchase) onlyOwner external {
    minWeiToPurchase = _minWeiToPurchase;
  }

  // Called when ether is sent to contract
  function () external payable {
    buyTokens(msg.sender);
  }

  //Used to buy tokens
  function buyTokens(address investor) public payable {
    //require(tx.gasprice <= 50000000 wei);
    require(status == State.Active);
    require(msg.value > minWeiToPurchase);

    uint weiAmount = msg.value;

    checkCapAndRecord(investor,weiAmount);

    allocateToken(investor,weiAmount);

    // update state
    weiRaised = weiRaised.add(weiAmount);
  }

  //Refund users in case of unsuccessful crowdsale
  function refund(address _investor) onlyOwner public {
    require(_investor != address(0));
    
    uint256 weiAmount = investedSum[_investor];
    require(weiAmount > 0);

    if (status == State.Active) {
      uint256 investorTokens = tokensAllocated[_investor];
      investorTokens = investorTokens.add(bonusTokensAllocated[_investor]);

      totalTokensAllocated = totalTokensAllocated.sub(investorTokens);
    }

    tokensAllocated[_investor] = 0;
    bonusTokensAllocated[_investor] = 0;
    investedSum[_investor] = 0;
    weiRaised = weiRaised.sub(weiAmount);

    _investor.transfer(weiAmount);

    Refunded(_investor, weiAmount);
  }

  //Internal call to check max user cap
  function checkCapAndRecord(address investor, uint weiAmount) internal {
      uint remaindingCap = maxBuyCap[investor];
      require(remaindingCap > weiAmount);
      maxBuyCap[investor] = remaindingCap.sub(weiAmount);
      investedSum[investor] = investedSum[investor].add(weiAmount);
  }

  //Internal call to allocated tokens purchased
    function allocateToken(address investor, uint weiAmount) internal {
        // calculate token amount to be created
        uint tokens = weiAmount.mul(rate);
        uint bonusTokens = weiAmount.div(100).mul(getTimeBasedBonusRate());
        
        uint tokensToAllocate = tokens.add(bonusTokens);
        
        require(getTokensLeft() >= tokensToAllocate);
        totalTokensAllocated = totalTokensAllocated.add(tokensToAllocate);

        tokensAllocated[investor] += tokens;
        bonusTokensAllocated[investor] += bonusTokens;

        if (tokensHasSoldOut()) {
          endCrowdSale();
        }
        TokenPurchase(investor, weiAmount, tokens, bonusTokens);
  }
  //Checks if token has been sold out
    function tokensHasSoldOut() view internal returns (bool) {
      if (getTokensLeft() <= leftoverTokensBuffer) {
        return true;
      } else {
        return false;
      }
    }

  //Used by investor to claim token
    function claimTokens() external {
      require(status == State.Ended);

      address tokenReceiver = msg.sender;
      uint tokensToClaim = tokensAllocated[tokenReceiver];

      require(tokensToClaim > 0);
      tokensAllocated[tokenReceiver] = 0;

      violaToken.transferFrom(owner, tokenReceiver, tokensToClaim);

      TokenDistributed(tokenReceiver, tokensToClaim);

    }

    //Used by investor to claim bonus token
    function claimBonusToken() external {
      require(status == State.Ended);
      require(now >= startTime + bonusVestingPeriod);

      address tokenReceiver = msg.sender;
      uint tokensToClaim = bonusTokensAllocated[tokenReceiver];

      require(tokensToClaim > 0);
      bonusTokensAllocated[tokenReceiver] = 0;

      violaToken.transferFrom(owner, tokenReceiver, tokensToClaim);

      BonusTokenDistributed(tokenReceiver, tokensToClaim);
    }

    //Used by owner to distribute bonus token
    function distributeBonusTokens(address _tokenReceiver) onlyOwner external {
      require(status == State.Ended);
      require(now >= startTime + bonusVestingPeriod);

      address tokenReceiver = _tokenReceiver;
      uint tokensToClaim = bonusTokensAllocated[tokenReceiver];

      require(tokensToClaim > 0);
      bonusTokensAllocated[tokenReceiver] = 0;

      transferTokens(tokenReceiver, tokensToClaim);

      BonusTokenDistributed(tokenReceiver,tokensToClaim);

    }

    //Used by owner to distribute token
    function distributeICOTokens(address _tokenReceiver) onlyOwner external {
      require(status == State.Ended);

      address tokenReceiver = _tokenReceiver;
      uint tokensToClaim = tokensAllocated[tokenReceiver];

      require(tokensToClaim > 0);
      tokensAllocated[tokenReceiver] = 0;

      transferTokens(tokenReceiver, tokensToClaim);

      TokenDistributed(tokenReceiver,tokensToClaim);

    }


    //For owner to reserve token for presale
    function reserveTokens(uint _amount) onlyOwner external {

      require(getTokensLeft() >= _amount);
      totalTokensAllocated = totalTokensAllocated.add(_amount);
      totalReservedTokenAllocated = totalReservedTokenAllocated.add(_amount);

    }

    //To distribute tokens not allocated by crowdsale contract
    function distributePresaleTokens(address _tokenReceiver, uint _amount) onlyOwner external {
      require(status == State.Ended);
      require(_tokenReceiver != address(0));
      require(_amount > 0);

      violaToken.transferFrom(owner, _tokenReceiver, _amount);

      TokenDistributed(_tokenReceiver,_amount);

    }

    //For external purchases via btc/fiat
    function externalPurchaseTokens(address _investor, uint _amount, uint _bonusAmount) onlyOwner external {
      require(_amount > 0);
      uint256 tokensToAllocate = _amount.add(_bonusAmount);

      require(getTokensLeft() >= tokensToAllocate);
      totalTokensAllocated = totalTokensAllocated.add(_amount);
      totalReservedTokenAllocated = totalReservedTokenAllocated.add(tokensToAllocate);

      tokensAllocated[_investor] += _amount;
      bonusTokensAllocated[_investor] += _bonusAmount;
      
      ExternalTokenPurchase(_investor,  _amount, _bonusAmount);

    }


  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(weiRaised);
  }

  // @return true if the transaction can buy tokens
  function withinPeriod() public view returns (bool) {
    return now >= startTime && now <= endTime;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public view returns (bool) {
    return now > endTime;
  }

  function getTokensLeft() public view returns (uint) {
    return violaToken.allowance(owner, this).sub(totalTokensAllocated);
  }

  function transferTokens (address receiver, uint tokenAmount) internal {
     require(violaToken.transferFrom(owner, receiver, tokenAmount));
  }

  function getAddressAllocatedTokens(address investor) public view returns(uint) {
    return tokensAllocated[investor];
  }

  function getAddressBonusAllocatedTokens(address investor) public view returns(uint) {
    return bonusTokensAllocated[investor];
  }

  function getAddressAmtInvested(address investor) public view returns(uint) {
    return investedSum[investor];
  }

  function emergencyERC20Drain( ERC20 token, uint amount ) external onlyOwner {
        token.transfer(owner,amount);
    }

  function getTimeBasedBonusRate() public view returns(uint) {
    bool withinTwoDay = now >= startTime && now <= (startTime + (86400 * 2));
    bool withinDay3and10 = now > (startTime + (86400 * 2)) && now <= (startTime + (86400 * 10));
    bool afterDay10 = now > (startTime + (86400 * 10)) && now <= endTime;
    if (withinTwoDay) {
      return bonusTokenRateByLevels[0];
    } else if (withinDay3and10) {
      return bonusTokenRateByLevels[1];
    } else if (afterDay10) {
      return bonusTokenRateByLevels[2];
    } else {
      return 0;
    }
  }

}

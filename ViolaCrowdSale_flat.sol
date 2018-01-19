pragma solidity ^0.4.18;


/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  uint256 public totalSupply;
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}



/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() public {
    owner = msg.sender;
  }


  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }


  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}




library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a / b;
    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

interface tokenRecipient { function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) public; }
interface TokenUpgraderInterface{ function upgradeFor(address _for, uint256 _value) public returns (bool success); function upgradeFrom(address _by, address _for, uint256 _value) public returns (bool success); }

contract TokenERC20 {
    using SafeMath for uint256;

    address public owner = msg.sender;

    // Public variables of the token
    string public name = "VIOLA";
    string public symbol = "VIOLA";
    uint8 public decimals = 18;
    // 18 decimals is the strongly suggested default, avoid changing it
    uint256 public totalSupply = 250000000 * 10 ** uint256(decimals);

    bool public upgradable = false;
    bool public upgraderSet = false;
    TokenUpgraderInterface public upgrader;

    // This creates an array with all balances
    mapping (address => uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;
    mapping (address => mapping (address => uint256)) allowed;

    // This generates a public event on the blockchain that will notify clients
    event Transfer(address indexed from, address indexed to, uint256 value);

    // This notifies clients about the amount burnt
    event Burn(address indexed from, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    function TokenERC20() public {
        balanceOf[msg.sender] = totalSupply;                // Give the creator all initial tokens
    }

    /**
     * Internal transfer, only can be called by this contract
     */
    function _transfer(address _from, address _to, uint _value) internal {
        // Prevent transfer to 0x0 address. Use burn() instead
        require(_to != 0x0);
        // Check if the sender has enough
        require(balanceOf[_from] >= _value);
        // Check for overflows
        require(balanceOf[_to] + _value > balanceOf[_to]);
        // Save this for an assertion in the future
        uint previousBalances = balanceOf[_from] + balanceOf[_to];
        // Subtract from the sender
        balanceOf[_from] -= _value;
        // Add the same to the recipient
        balanceOf[_to] += _value;
        Transfer(_from, _to, _value);
        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(balanceOf[_from] + balanceOf[_to] == previousBalances);
    }

    /**
     * Transfer tokens
     *
     * Send `_value` tokens to `_to` from your account
     *
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transfer(address _to, uint256 _value) public {
        _transfer(msg.sender, _to, _value);
    }

    /**
     * Transfer tokens from other address
     *
     * Send `_value` tokens to `_to` in behalf of `_from`
     *
     * @param _from The address of the sender
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= allowance[_from][msg.sender]);     // Check allowance
        allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    /**
     * Set allowance for other address
     *
     * Allows `_spender` to spend no more than `_value` tokens in your behalf
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     */
    function approve(address _spender, uint256 _value) public
        returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        return true;
    }

    /**
     * Set allowance for other address and notify
     *
     * Allows `_spender` to spend no more than `_value` tokens in your behalf, and then ping the contract about it
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     * @param _extraData some extra information to send to the approved contract
     */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData)
        public
        returns (bool success) {
        tokenRecipient spender = tokenRecipient(_spender);
        if (approve(_spender, _value)) {
            spender.receiveApproval(msg.sender, _value, this, _extraData);
            return true;
        }
    }

    /**
     * Destroy tokens
     *
     * Remove `_value` tokens from the system irreversibly
     *
     * @param _value the amount of money to burn
     */
    function burn(uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);   // Check if the sender has enough
        balanceOf[msg.sender] -= _value;            // Subtract from the sender
        totalSupply -= _value;                      // Updates totalSupply
        Burn(msg.sender, _value);
        return true;
    }

    /**
     * Destroy tokens from other account
     *
     * Remove `_value` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from the address of the sender
     * @param _value the amount of money to burn
     */
    function burnFrom(address _from, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value);                // Check if the targeted balance is enough
        require(_value <= allowance[_from][msg.sender]);    // Check allowance
        balanceOf[_from] -= _value;                         // Subtract from the targeted balance
        allowance[_from][msg.sender] -= _value;             // Subtract from the sender's allowance
        totalSupply -= _value;                              // Update totalSupply
        Burn(_from, _value);
        return true;
    }

    /**
   * @dev Function to allow token upgrades
   * @param _newState New upgrading allowance state
   * @return A boolean that indicates if the operation was successful.
   */

    function allowUpgrading(bool _newState) onlyOwner public returns (bool success) {
        upgradable = _newState;
        return true;
    }

    function setUpgrader(address _upgraderAddress) onlyOwner public returns (bool success) {
        require(!upgraderSet);
        require(_upgraderAddress != address(0));
        upgraderSet = true;
        upgrader = TokenUpgraderInterface(_upgraderAddress);
        return true;
    }

    function upgrade() public returns (bool success) {
        require(upgradable);
        require(upgraderSet);
        require(upgrader != TokenUpgraderInterface(0));
        uint256 value = balanceOf[msg.sender];
        assert(value > 0);
        delete balanceOf[msg.sender];
        totalSupply = totalSupply.sub(value);
        assert(upgrader.upgradeFor(msg.sender, value));
        return true;
    }

    function upgradeFor(address _for, uint256 _value) public returns (bool success) {
        require(upgradable);
        require(upgraderSet);
        require(upgrader != TokenUpgraderInterface(0));
        uint256 _allowance = allowed[_for][msg.sender];
        require(_allowance >= _value);
        balanceOf[_for] = balanceOf[_for].sub(_value);
        allowed[_for][msg.sender] = _allowance.sub(_value);
        totalSupply = totalSupply.sub(_value);
        assert(upgrader.upgradeFrom(msg.sender, _for, _value));
        return true;
    }

    function () payable external {
        if (upgradable) {
            assert(upgrade());
            return;
        }
        revert();
    }
}






/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}





/**
 * @title ViolaCrowdsale
 * @dev ViolaCrowdsale reserves token from supply when eth is received
 * funds will be forwarded after the end of crowdsale. Tokens will be claimable
 * within 7 days after crowdsale ends.
 */
 
contract ViolaCrowdsale is Ownable {
  using SafeMath for uint256;

  enum State { Deployed, PendingStart, Active, Paused, Ended, Completed }

  //Status of contract
  State public status = State.Deployed;

  // The token being sold
  TokenERC20 public violaToken;

  //For keeping track of whitelist address. cap >0 = whitelisted
  mapping(address=>uint) public maxBuyCap;

  //For checking if address passed KYC
  mapping(address => bool)public addressKYC;

  //Total wei sum an address has invested
  mapping(address=>uint) public investedSum;

  //Total violaToken an address is allocated
  mapping(address=>uint) public tokensAllocated;

    //Total violaToken an address purchased externally is allocated
  mapping(address=>uint) public externalTokensAllocated;

  //Total bonus violaToken an address is entitled after vesting
  mapping(address=>uint) public bonusTokensAllocated;

  //Total bonus violaToken an address purchased externally is entitled after vesting
  mapping(address=>uint) public externalBonusTokensAllocated;

  //Store addresses that has registered for crowdsale before (pushed via setWhitelist)
  //Does not mean whitelisted as it can be revoked. Just to track address for loop
  address[] public registeredAddress;

  //Start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;
  uint256 public bonusVestingPeriod = 60 days;


  /**
   * Note all values are calculated in wei(uint256) including token amount
   * 1 ether = 1000000000000000000 wei
   * 1 viola = 1000000000000000000 violawei
   */


  //Address where funds are collected
  address public wallet;

  //Min amount investor can purchase
  uint256 public minWeiToPurchase;

  // how many token units a buyer gets per eth
  uint256 public rate;

  //Extra bonus token to give *per ETH*
  uint public bonusTokenRateLevelOne = 30;
  uint public bonusTokenRateLevelTwo = 15;
  uint public bonusTokenRateLevelThree = 8;

  //Total amount of tokens allocated for crowdsale
  uint256 public totalTokensAllocated;

  //Total amount of tokens reserved from external sources
  //Sub set of totalTokensAllocated ( totalTokensAllocated - totalReservedTokenAllocated = total tokens allocated for purchases using ether )
  uint256 public totalReservedTokenAllocated;

  //Numbers of token left above 0 to still be considered sold
  uint256 public leftoverTokensBuffer;

  /**
   * event for front end logging
   */

  event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount, uint256 bonusAmount);
  event ExternalTokenPurchase(address indexed purchaser, uint256 amount, uint256 bonusAmount);
  event ExternalPurchaseRefunded(address indexed purchaser, uint256 amount, uint256 bonusAmount);
  event TokenDistributed(address indexed tokenReceiver, uint256 tokenAmount);
  event BonusTokenDistributed(address indexed tokenReceiver, uint256 tokenAmount);
  event TopupTokenAllocated(address indexed tokenReceiver, uint256 amount, uint256 bonusAmount);
  event CrowdsalePending();
  event CrowdsaleStarted();
  event CrowdsaleEnded();
  event BonusRateChanged();
  event Refunded(address indexed beneficiary, uint256 weiAmount);

  //Set inital arguments of the crowdsale
  function initaliseCrowdsale (uint256 _startTime, uint256 _endTime, uint256 _rate, address _tokenAddress, address _wallet) onlyOwner external {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(address(_tokenAddress) != address(0));
    require(_wallet != address(0));

    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
    violaToken = TokenERC20(_tokenAddress);

    status = State.PendingStart;

    CrowdsalePending();

  }

  /**
   * Crowdsale state functions
   * To track state of current crowdsale
   */


  // To be called by Ethereum alarm clock or anyone
  //Can only be called successfully when time is valid
  function startCrowdSale() external {
    require(withinPeriod());
    require(violaToken != address(0));
    require(getTokensLeft() > 0);
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
    require(hasEnded());
    require(violaToken.allowance(owner, this) == 0);
    status = State.Completed;

    _forwardFunds();

    assert(this.balance == 0);
  }

  function burnExtraTokens() onlyOwner external {
    require(hasEnded());
    uint256 extraTokensToBurn = violaToken.allowance(owner, this);
    violaToken.burnFrom(owner, extraTokensToBurn);
    assert(violaToken.allowance(owner, this) == 0);
  }

  // send ether to the fund collection wallet
  function _forwardFunds() internal {
    wallet.transfer(this.balance);
  }

  function partialForwardFunds(uint _amountToTransfer) onlyOwner external {
    require(status == State.Ended);
    uint amountAllowedForRefund = this.balance.sub(_getUnapprovedAddressFunds());
    require(_amountToTransfer < amountAllowedForRefund);
    wallet.transfer(_amountToTransfer);
  }

  function _getUnapprovedAddressFunds() internal view returns (uint) {
    uint totalApprovedAmt = 0;
    for (uint counter = 0; counter < registeredAddress.length; counter ++) {
      address currAddress = registeredAddress[counter];
      if (!addressKYC[currAddress]) {
        totalApprovedAmt = totalApprovedAmt.add(investedSum[currAddress]);
      }
    }
    return totalApprovedAmt;
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

  //Set the ether to token rate
  function setRate(uint _rate) onlyOwner external {
    require(_rate > 0);
    rate = _rate;
  }

  function setBonusTokenRateLevelOne(uint _rate) onlyOwner external {
    require(_rate > 0);
    bonusTokenRateLevelOne = _rate;
    BonusRateChanged();
  }

  function setBonusTokenRateLevelTwo(uint _rate) onlyOwner external {
    require(_rate > 0);
    bonusTokenRateLevelTwo = _rate;
    BonusRateChanged();
  }

  function setBonusTokenRateLevelThree(uint _rate) onlyOwner external {
    require(_rate > 0);
    bonusTokenRateLevelThree = _rate;
    BonusRateChanged();
  }

  function setMinWeiToPurchase(uint _minWeiToPurchase) onlyOwner external {
    minWeiToPurchase = _minWeiToPurchase;
  }


  /**
   * Whitelisting and KYC functions
   * Whitelisted address can buy tokens, KYC successful purchaser can claim token. Refund if fail KYC
   */


  //Set the amount of wei an address can purchase up to
  //Value of 0 = not whitelisted
  function setWhitelistAddress( address _investor, uint _cap ) onlyOwner external {
        require(_cap > 0);
        require(_investor != address(0));
        maxBuyCap[_investor] = _cap;
        registeredAddress.push(_investor);
        //add event
    }

  //Remove the address from whitelist
  function removeWhitelistAddress(address _investor) onlyOwner external {
    require(_investor != address(0));
    
    maxBuyCap[_investor] = 0;
    uint256 weiAmount = investedSum[_investor];

    if (weiAmount > 0) {
      _refund(_investor);
    }
  }

  //Flag address as KYC approved. Address is now approved to claim tokens
  function approveKYC(address _kycAddress) onlyOwner external {
    require(_kycAddress != address(0));
    addressKYC[_kycAddress] = true;
  }

  //Set KYC status as failed. Refund any eth back to address
  function revokeKYC(address _kycAddress) onlyOwner external {
    require(_kycAddress != address(0));
    addressKYC[_kycAddress] = false;

    uint256 weiAmount = investedSum[_kycAddress];
    if (weiAmount > 0) {
      _refund(_kycAddress);
    }
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
    bool withinTwoDay = now >= startTime && now <= (startTime + 2 days);
    bool withinDay3and10 = now > (startTime + 2 days) && now <= (startTime + 10 days);
    bool afterDay10 = now > (startTime + 10 days) && now <= endTime;
    if (withinTwoDay) {
      return bonusTokenRateLevelOne;
    } else if (withinDay3and10) {
      return bonusTokenRateLevelTwo;
    } else if (afterDay10) {
      return bonusTokenRateLevelThree;
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

  function _clearTotalNormalTokensByAddress(address _investor) internal {
    tokensAllocated[_investor] = 0;
    externalTokensAllocated[_investor] = 0;
  }

  function _clearTotalBonusTokensByAddress(address _investor) internal {
    bonusTokensAllocated[_investor] = 0;
    externalBonusTokensAllocated[_investor] = 0;
  }


  /**
   * Functions to handle buy tokens
   * Fallback function as entry point for eth
   */


  // Called when ether is sent to contract
  function () external payable {
    buyTokens(msg.sender);
  }

  //Used to buy tokens
  function buyTokens(address investor) internal {
    require(status == State.Active);
    require(msg.value >= minWeiToPurchase);

    uint weiAmount = msg.value;

    checkCapAndRecord(investor,weiAmount);

    allocateToken(investor,weiAmount);
    
  }

  //Internal call to check max user cap
  function checkCapAndRecord(address investor, uint weiAmount) internal {
      uint remaindingCap = maxBuyCap[investor];
      require(remaindingCap >= weiAmount);
      maxBuyCap[investor] = remaindingCap.sub(weiAmount);
      investedSum[investor] = investedSum[investor].add(weiAmount);
  }

  //Internal call to allocated tokens purchased
    function allocateToken(address investor, uint weiAmount) internal {
        // calculate token amount to be created
        uint tokens = weiAmount.mul(rate);
        uint bonusTokens = tokens.div(100).mul(getTimeBasedBonusRate());
        
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



  /**
   * Functions for refunds & claim tokens
   * 
   */



  //Refund users in case of unsuccessful crowdsale
  function _refund(address _investor) internal {
    uint256 investedAmt = investedSum[_investor];
    require(investedAmt > 0);

  
      uint totalInvestorTokens = tokensAllocated[_investor].add(bonusTokensAllocated[_investor]);

    if (status == State.Active) {
      //Refunded tokens go back to sale pool
      totalTokensAllocated = totalTokensAllocated.sub(totalInvestorTokens);
    }

    _clearAddressFromCrowdsale(_investor);

    _investor.transfer(investedAmt);

    Refunded(_investor, investedAmt);
  }

    //Partial refund users
  function refundPartial(address _investor, uint _refundAmt, uint _tokenAmt, uint _bonusTokenAmt) onlyOwner external {

    uint investedAmt = investedSum[_investor];
    require(investedAmt > _refundAmt);
    require(tokensAllocated[_investor] > _tokenAmt);
    require(bonusTokensAllocated[_investor] > _bonusTokenAmt);

    investedSum[_investor] = investedSum[_investor].sub(_refundAmt);
    tokensAllocated[_investor] = tokensAllocated[_investor].sub(_tokenAmt);
    bonusTokensAllocated[_investor] = bonusTokensAllocated[_investor].sub(_bonusTokenAmt);


    uint totalRefundTokens = _tokenAmt.add(_bonusTokenAmt);

    if (status == State.Active) {
      //Refunded tokens go back to sale pool
      totalTokensAllocated = totalTokensAllocated.sub(totalRefundTokens);
    }

    _investor.transfer(_refundAmt);

    Refunded(_investor, _refundAmt);
  }

  //Used by investor to claim token
    function claimTokens() external {
      require(hasEnded());
      require(addressKYC[msg.sender]);
      address tokenReceiver = msg.sender;
      uint tokensToClaim = getTotalNormalTokensByAddress(tokenReceiver);

      require(tokensToClaim > 0);
      _clearTotalNormalTokensByAddress(tokenReceiver);

      violaToken.transferFrom(owner, tokenReceiver, tokensToClaim);

      TokenDistributed(tokenReceiver, tokensToClaim);

    }

    //Used by investor to claim bonus token
    function claimBonusTokens() external {
      require(hasEnded());
      require(now >= startTime + bonusVestingPeriod);
      require(addressKYC[msg.sender]);

      address tokenReceiver = msg.sender;
      uint tokensToClaim = getTotalBonusTokensByAddress(tokenReceiver);

      require(tokensToClaim > 0);
      _clearTotalBonusTokensByAddress(tokenReceiver);

      violaToken.transferFrom(owner, tokenReceiver, tokensToClaim);

      BonusTokenDistributed(tokenReceiver, tokensToClaim);
    }

    //Used by owner to distribute bonus token
    function distributeBonusTokens(address _tokenReceiver) onlyOwner external {
      require(hasEnded());
      require(now >= startTime + bonusVestingPeriod);

      address tokenReceiver = _tokenReceiver;
      uint tokensToClaim = getTotalBonusTokensByAddress(tokenReceiver);

      require(tokensToClaim > 0);
      _clearTotalBonusTokensByAddress(tokenReceiver);

      transferTokens(tokenReceiver, tokensToClaim);

      BonusTokenDistributed(tokenReceiver,tokensToClaim);

    }

    //Used by owner to distribute token
    function distributeICOTokens(address _tokenReceiver) onlyOwner external {
      require(hasEnded());

      address tokenReceiver = _tokenReceiver;
      uint tokensToClaim = getTotalNormalTokensByAddress(tokenReceiver);

      require(tokensToClaim > 0);
      _clearTotalNormalTokensByAddress(tokenReceiver);

      transferTokens(tokenReceiver, tokensToClaim);

      TokenDistributed(tokenReceiver,tokensToClaim);

    }

    //For owner to reserve token for presale
    // function reserveTokens(uint _amount) onlyOwner external {

    //   require(getTokensLeft() >= _amount);
    //   totalTokensAllocated = totalTokensAllocated.add(_amount);
    //   totalReservedTokenAllocated = totalReservedTokenAllocated.add(_amount);

    // }

    // //To distribute tokens not allocated by crowdsale contract
    // function distributePresaleTokens(address _tokenReceiver, uint _amount) onlyOwner external {
    //   require(hasEnded());
    //   require(_tokenReceiver != address(0));
    //   require(_amount > 0);

    //   violaToken.transferFrom(owner, _tokenReceiver, _amount);

    //   TokenDistributed(_tokenReceiver,_amount);

    // }

    //For external purchases & pre-sale via btc/fiat
    function externalPurchaseTokens(address _investor, uint _amount, uint _bonusAmount) onlyOwner external {
      require(_amount > 0);
      uint256 totalTokensToAllocate = _amount.add(_bonusAmount);

      require(getTokensLeft() >= totalTokensToAllocate);
      totalTokensAllocated = totalTokensAllocated.add(totalTokensToAllocate);
      totalReservedTokenAllocated = totalReservedTokenAllocated.add(totalTokensToAllocate);

      externalTokensAllocated[_investor] += _amount;
      externalBonusTokensAllocated[_investor] += _bonusAmount;

      assert(externalTokensAllocated[_investor] > 0);
      assert(externalBonusTokensAllocated[_investor] >= 0);
      
      ExternalTokenPurchase(_investor,  _amount, _bonusAmount);

    }

    function refundAllExternalPurchase(address _investor) onlyOwner external {
      require(_investor != address(0));
      require(externalTokensAllocated[_investor] > 0);

      uint externalTokens = externalTokensAllocated[_investor];
      uint externalBonusTokens = externalBonusTokensAllocated[_investor];

      externalTokensAllocated[_investor] = 0;
      externalBonusTokensAllocated[_investor] = 0;

      uint totalInvestorTokens = externalTokens.add(externalBonusTokens);

      totalReservedTokenAllocated = totalReservedTokenAllocated.sub(totalInvestorTokens);
      totalTokensAllocated = totalTokensAllocated.sub(totalInvestorTokens);

      ExternalPurchaseRefunded(_investor,externalTokens,externalBonusTokens);
    }

    function refundExternalPurchase(address _investor, uint _amountToRefund, uint _bonusAmountToRefund) onlyOwner external {
      require(_investor != address(0));
      require(externalTokensAllocated[_investor] >= _amountToRefund);
      require(externalBonusTokensAllocated[_investor] >= _bonusAmountToRefund);

      uint totalTokensToRefund = _amountToRefund.add(_bonusAmountToRefund);
      externalTokensAllocated[_investor] = externalTokensAllocated[_investor].sub(_amountToRefund);
      externalBonusTokensAllocated[_investor] = externalBonusTokensAllocated[_investor].sub(_bonusAmountToRefund);

      totalReservedTokenAllocated = totalReservedTokenAllocated.sub(totalTokensToRefund);
      totalTokensAllocated = totalTokensAllocated.sub(totalTokensToRefund);

      ExternalPurchaseRefunded(_investor,_amountToRefund,_bonusAmountToRefund);
    }

    function _clearAddressFromCrowdsale(address _investor) internal {
      tokensAllocated[_investor] = 0;
      bonusTokensAllocated[_investor] = 0;
      investedSum[_investor] = 0;
      maxBuyCap[_investor] = 0;
    }

    function allocateTopupToken(address _investor, uint _amount, uint _bonusAmount) onlyOwner external {
      require(hasEnded());
      require(_amount > 0);
      uint256 tokensToAllocate = _amount.add(_bonusAmount);

      require(getTokensLeft() >= tokensToAllocate);
      totalTokensAllocated = totalTokensAllocated.add(_amount);

      tokensAllocated[_investor] += _amount;
      bonusTokensAllocated[_investor] += _bonusAmount;

      TopupTokenAllocated(_investor,  _amount, _bonusAmount);
    }

  //For cases where token are mistakenly sent / airdrops
  function emergencyERC20Drain( ERC20 token, uint amount ) external onlyOwner {
    require(status == State.Completed);
    token.transfer(owner,amount);
  }

}

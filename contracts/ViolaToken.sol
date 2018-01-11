
pragma solidity ^0.4.18;
import '../node_modules/zeppelin-solidity/contracts/token/StandardToken.sol';
import '../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol';

contract ViolaToken is StandardToken {
    string public constant NAME = "ViolaToken";
    string public constant SYMBOL = "VIOLA";
    uint8 public constant DECIMAL = 18;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(DECIMAL));

  function ViolaToken() public 
  {
    totalSupply = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
     function burn(uint256 _value) public 
     {
        require(_value > 0);
        require(_value <= balances[msg.sender]);
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply = totalSupply.sub(_value);
        //Burn(burner, _value);
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
        require(balances[_from] >= _value);                // Check if the targeted balance is enough
        require(_value <= allowance(_from,msg.sender));    // Check allowance
        balances[_from] -= _value;                         // Subtract from the targeted balance        
        decreaseApproval(_from,_value);                     // Subtract from the sender's allowance
        totalSupply -= _value;                              // Update totalSupply
        return true;
    }
}
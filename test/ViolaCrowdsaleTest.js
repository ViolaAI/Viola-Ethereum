// Contract to be tested
var ViolaCrowdsale = artifacts.require("./ViolaCrowdsale.sol")
var ViolaToken = artifacts.require("./ViolaToken.sol")

// Test suite
contract('ViolaCrowdsale', function(accounts) {
  var violaCrowdsaleInstance;

  // Test case: check initial values
  it("should be initialized with empty values", function() {
    return ViolaCrowdsale.deployed().then(function(instance) {
      return instance.startTime.call()
    }).then(function(data) {
        console.log(data)
    });
  });

  it("should be able to set the token address", function() {
      var violaTokenInstance
      var violaCrowdsaleInstance
      return ViolaToken.deployed().then(function(instance) {
          violaTokenInstance = instance
          return ViolaCrowdsale.deployed()
        }).then(function(instance) {
            violaCrowdsaleInstance = instance
            return instance.setToken(violaTokenInstance.address)
        }).then(function() {
            return violaCrowdsaleInstance.myToken.call()
        }).then(function(data) {
            console.log(data)
        })
  })

  it("should be able to add a whitelist address", function() {
      return ViolaCrowdsale.deployed().then(function(instance) {
        violaCrowdsaleInstance = instance
          return instance.setWhitelistAddress(accounts[1], 10)
      }).then(function() {
          return violaCrowdsaleInstance.getAddressCap(accounts[1])
      }).then(function(data) {
          console.log(data)
      })
  })
});

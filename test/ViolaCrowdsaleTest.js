

// Contract to be tested
var ViolaCrowdSale = artifacts.require("./ViolaCrowdsale.sol")
var ViolaToken = artifacts.require("./ViolaToken.sol")

// Test suite
contract('ViolaCrowdsale', function(accounts) {
  
  var violaTokenInstance
  
  // Check initial values
  describe('initialize', function() {
    var violaCrowdSaleInstance;

    beforeEach(function() {
        return ViolaCrowdSale.deployed().then(function(instance) {
            violaCrowdSaleInstance = instance
        })
    })

    it('should have a start time', function() {
        return violaCrowdSaleInstance.startTime.call().then(function(startTime) {
            assert.isAbove(parseInt(startTime), 0, 'start time should not be 0')
        })
    })

    it('should have an end time', function() {
        return violaCrowdSaleInstance.endTime.call().then(function(endTime) {
            assert.isAbove(parseInt(endTime), 0, 'end time should not be 0')
        })
    })

    it('should have a rate', function() {
        return violaCrowdSaleInstance.rate.call().then(function(rate) {
            assert.isAbove(parseFloat(rate), 0, 'rate should not be 0')
        })
    })

    it('end time should not be earlier than start time', function() {
        var endTime
        return violaCrowdSaleInstance.endTime.call().then(function(time) {
            endTime = time
            return violaCrowdSaleInstance.startTime.call()
        }).then(function(startTime) {
            assert.isAbove(parseInt(endTime), parseInt(startTime), 'end time is earlier than start time')
        })
    })

    it("owner should be able to allocate token supply to crowdsale", function() {
        var violaTokenInstance
        var violaCrowdsaleInstance
        return ViolaCrowdsale.deployed().then(function(instance) {
            violaCrowdsaleInstance = instance
            return ViolaToken.deployed()
        }).then(function(instance) {
            violaTokenInstance = instance
            return violaTokenInstance.approve(violaCrowdsaleInstance.address,500000000000)
        }).then(function(data) {
            console.log(data)
            return violaCrowdsaleInstance.getTokensLeft.call();
        }).then(function(returnValue){
            console.log(returnValue)
        })
    })
    
    it("User should be able to send eth to crowdsale", function() {
        var violaTokenInstance
        var violaCrowdsaleInstance
        return ViolaCrowdsale.deployed().then(function(instance) {
            violaCrowdsaleInstance = instance
            return ViolaToken.deployed()
        }).then(function(instance) {
            violaTokenInstance = instance
        }).then(function(){
            return violaCrowdsaleInstance.sendTransaction({
                from: accounts[1],
                gas: 500000,
                value: 50000000
              })
        }).then(function(result) {
        })
    })

  })
})
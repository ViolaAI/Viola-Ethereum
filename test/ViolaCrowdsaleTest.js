// Contract to be tested
var ViolaCrowdSale = artifacts.require("./ViolaCrowdsale.sol")
var ViolaToken = artifacts.require("./ViolaToken.sol")

// Test suite
contract('ViolaCrowdsale', function(accounts) {
  var violaCrowdSaleInstance;
  var violaTokenInstance
  
  // Check initial values
  describe('initialize', function() {
    var endTime
    it('should be initialized with a start time', function() {
        return ViolaCrowdSale.deployed().then(function(instance) {
          return instance.startTime.call()
        }).then(function(startTime) {
            assert.isAbove(startTime, 0, 'start time should not be 0')
        })
      })

      it('should be initialized with an end time', function() {
        return ViolaCrowdSale.deployed().then(function(instance) {
          return instance.endTime.call()
        }).then(function(endTime) {
            assert.isAbove(endTime, 0, 'end time should not be 0')
        })
      })

      it('end time should not be lesser than start time', function() {
        return ViolaCrowdSale.deployed().then(function(instance) {
          violaCrowdSaleInstance = instance
          return violaCrowdSaleInstance.endTime.call()
        }).then(function(time) {
            endTime = time
            return violaCrowdSaleInstance.startTime.call()
        }).then(function(startTime) {
            assert.isAbove(endTime, startTime, 'end time should be later than start time')
        })
      })

      it('should be initiated with a rate', function(){
        return ViolaCrowdSale.deployed().then(function(instance) {
            violaCrowdSaleInstance = instance
            return violaCrowdSaleInstance.rate.call()
          }).then(function(rate) {
              assert.isAbove(rate, 0, 'rate should not be 0')
          })
        })
  })
  

  describe('token address', function() {
    it('should be able to set the token address', function() {
        return ViolaToken.deployed().then(function(instance) {
            violaTokenInstance = instance
            return ViolaCrowdSale.deployed()
          }).then(function(instance) {
              violaCrowdSaleInstance = instance
              return instance.setToken(violaTokenInstance.address)
          }).then(function() {
              return violaCrowdSaleInstance.myToken.call()
          }).then(function(data) {
              assert.equal(data, violaTokenInstance.address, 'token address is not equal')
          })
    })

    it('token address should not be 0', function() {
        return ViolaCrowdSale.deployed().then(function(instance) {
              violaCrowdSaleInstance = instance
              assert.throws(function() {
                  instance.setToken(0)
              }, Error, 'Error thrown')
          })
    })
  })


  

  



  it("should be able to start crowd sale", function() {
      return ViolaToken.deployed().then(function(instance) {
        violaTokenInstance = instance
      }).then(function(instance) {

      })
  })

});

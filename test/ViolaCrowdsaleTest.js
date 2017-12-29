
// Contract to be tested
var ViolaCrowdSale = artifacts.require("./ViolaCrowdsale.sol")
var ViolaToken = artifacts.require("./ViolaToken.sol")

// Test suite
contract('ViolaCrowdsale', function (accounts) {

    var violaTokenInstance
    var violaCrowdSaleInstance;

    beforeEach(function () {
        return ViolaCrowdSale.deployed().then(function (instance) {
            violaCrowdSaleInstance = instance
            return ViolaToken.deployed()
        }).then(function (instance) {
            violaTokenInstance = instance
        })
    })

    it('should have a start time', function () {
        return violaCrowdSaleInstance.startTime.call().then(function (startTime) {
            assert.isAbove(parseInt(startTime), 0, 'start time should not be 0')
        })
    })

    it('should have an end time', function () {
        return violaCrowdSaleInstance.endTime.call().then(function (endTime) {
            assert.isAbove(parseInt(endTime), 0, 'end time should not be 0')
        })
    })

    it('should have a rate', function () {
        return violaCrowdSaleInstance.rate.call().then(function (rate) {
            assert.isAbove(parseFloat(rate), 0, 'rate should not be 0')
        })
    })

    it('end time should not be earlier than start time', function () {
        var endTime
        return violaCrowdSaleInstance.endTime.call().then(function (time) {
            endTime = time
            return violaCrowdSaleInstance.startTime.call()
        }).then(function (startTime) {
            assert.isAbove(parseInt(endTime), parseInt(startTime), 'end time is earlier than start time')
        })
    })

    it('should not start crowdsale without token', function () {
        return violaCrowdSaleInstance.startCrowdSale({from:accounts[0], gas: 500000}).then(function() {
            assert.fail('should not pass')
        }).catch(function(error) {
            assert.isAbove(error.message.search('revert'), -1, 'Error containing "revert" must be returned');
        })
    })

    it('should be able to set token', function () {
        return violaCrowdSaleInstance.setToken(violaTokenInstance.address, {from: accounts[0], gas: 500000}).then(function() {
            return violaCrowdSaleInstance.myToken.call()
        }).then(function(token) {
            assert.equal(token, violaTokenInstance.address, 'token address is not equal')
        })
    })

    it('should start crowdsale with token', function () {
        return violaCrowdSaleInstance.startCrowdSale({from:accounts[0], gas: 500000}).then(function() {
            return violaCrowdSaleInstance.myToken.call()
        }).then(function(token) {
            assert.equal(token, violaTokenInstance.address, 'token address is not equal')
        }).catch(function(error) {
            assert.fail(error.message.search('revert'), -1, 'crowdsale unable to start with token');
        })
    })

    it('should be able to set a whitelist address', function () {
        var value = web3.toWei(1, 'ether')
        return violaCrowdSaleInstance.setWhitelistAddress(accounts[1], value, {from: accounts[0], gas: 500000}).then(function() {
            return violaCrowdSaleInstance.getAddressCap(accounts[1])
        }).then(function(cap) {
            assert.equal(cap, value, 'unable to set whitelist address')
        })
    })
})
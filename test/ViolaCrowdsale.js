import increaseTime from './helper/increaseTime'
import {expect} from 'Chai'
// Contract to be tested
const ViolaCrowdSale = artifacts.require('ViolaCrowdsale')
const ViolaToken = artifacts.require('VLTToken')

const BigNumber = web3.BigNumber

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should()

const State = {
    Deployed : 0,
    PendingStart: 1,
    Active : 2,
    Paused : 3,
    Ended : 4,
    Completed : 5
}

// Test suite
contract('ViolaCrowdsale', function (accounts) {

    const gasAmount = web3.toWei(1, 'ether')
    const initialTokens = web3.toWei(200, 'ether')
    const rate = new web3.BigNumber(100)
    const day = 86400

    beforeEach(async function () {
        const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
        const wallet = accounts[0]

        this.violaTokenInstance = await ViolaToken.new();        
        this.violaCrowdSaleInstance = await ViolaCrowdSale.new();
        await this.violaTokenInstance.approve(this.violaCrowdSaleInstance.address, initialTokens)            
        await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet);
    })

    describe('initializing contract', function () {
        it('should initialize from Deployed status', async function () {
            let state = await this.violaCrowdSaleInstance.status.call();
            state.should.be.bignumber.equal(new BigNumber(State.PendingStart))
        })

        it('should not initialize from PendingStart status', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })

        it('should not initialize from Active status', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })

        it('should not initialize from Paused status', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })

        it('should not initialize from Ended status', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })

        it('should not initialize from Completed status', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()         
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })
    })

    describe('starting crowdsale', function () {
        it('should start from PendingStart status', async function () {
            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
        })

        it('should not start from Active status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.startCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not start from Paused status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.startCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not start from Ended status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.startCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not start from Completed status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()         
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.startCrowdsale().should.be.rejectedWith('revert')
        })
    })

    describe('burning token', function() {
        it('should decrease contract allowance', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            let allowedTokens = await this.violaTokenInstance.allowance(accounts[0], this.violaCrowdSaleInstance.address)
            allowedTokens.should.be.bignumber.equal(new BigNumber(0))
        })
    })

    describe('pausing / unpausing crowdsale', function () {
        it('should pause from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Paused))
        })

        it('should not pause from PendingStart status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.pauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not pause from Paused status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not pause from Ended status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not pause from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should unpause from Paused status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.unpauseCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Active))
        })

        it('should not unpause from PendingStart status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.unpauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not unpause from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.unpauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not unpause from Ended status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.unpauseCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not unpause from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.unpauseCrowdsale().should.be.rejectedWith('revert')
        })
    })

    describe('ending crowdsale', function () {

        it('should not end when buffer is not hit', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            let purchaseID = web3.toWei(1, 'ether')
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1.8', 'ether')})
            let tokens = 180000000000000000000;
            let bonusTokens = 0;
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, purchaseID)
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Active))
        })

        it('should auto end when buffer is hit', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            let purchaseID = web3.toWei(1, 'ether')
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1.9', 'ether')})
            let tokens = 190000000000000000000;
            let bonusTokens = 0;
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, purchaseID)
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should auto end when sold out', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            let purchaseID = web3.toWei(1, 'ether')
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('2', 'ether')})
            let tokens = 200000000000000000000;
            let bonusTokens = 0;
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, purchaseID)
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should end from Active status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should not end from PendingStart status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not end from Paused status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not end from Ended status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not end from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })
    })

    describe('completing crowdsale', function () {

        it('should complete crowdsale from Ended status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()
            await this.violaCrowdSaleInstance.completeCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Completed))
        })

        it('should transfer funds to wallet when completed', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], web3.toWei('10', 'ether'), web3.toWei('10', 'ether'), web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.endCrowdsale()
            let initialAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            let finalAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            let diff = initialAmount.minus(finalAmount)
            diff.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })

        it('should not complete from PendingStart status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.completeCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not complete from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.completeCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not complete from Paused status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.completeCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not complete when there is allowance remaining', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.completeCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not complete from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })
        
    })

    describe('setting bonus rates', function () {
        let bonusTokenRate = new BigNumber(100)
        it('should allow update bonus rate > 0 for level one', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelOne.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should allow update bonus rate > 0 for level two', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelTwo.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should allow update bonus rate > 0 for level three', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelThree.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should allow update bonus rate > 0 for level four', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelFour(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelFour.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        let zeroBonusTokenRate = new BigNumber(0)
        it('should allow update bonus rate = 0 for level one', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(zeroBonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelOne.call()
            newBonusTokenRate.should.be.bignumber.equal(zeroBonusTokenRate)
        })

        it('should allow update bonus rate = 0 for level two', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(zeroBonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelTwo.call()
            newBonusTokenRate.should.be.bignumber.equal(zeroBonusTokenRate)
        })

        it('should allow update bonus rate = 0 for level three', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(zeroBonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelThree.call()
            newBonusTokenRate.should.be.bignumber.equal(zeroBonusTokenRate)
        })

        it('should allow update bonus rate = 0 for level four', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelFour(zeroBonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelFour.call()
            newBonusTokenRate.should.be.bignumber.equal(zeroBonusTokenRate)
        })
    })
  
    describe('checking bonus rates', function(){
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
        })
        it('at the beginning of Day 1 should be 25', async function(){
            await increaseTime(10) //after 10 second
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(25))
        })

        it('at the end of Day 2 should be 25', async function(){
            await increaseTime(day * 2 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(25))
        })

        it('at the beginning of Day 3 should be 20', async function(){
            await increaseTime(day * 2 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(20))
        })

        it('at the end of Day 7 should be 20', async function(){
            await increaseTime(day * 7 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(20))
        })

        it('at the beginning of Day 8 should be 15', async function(){
            await increaseTime(day * 7 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })

        it('at the end of Day 17 should be 15', async function(){
            await increaseTime(day * 17 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })
        
        it('at the beginning of Day 18 should be 10', async function(){
            await increaseTime(day * 18 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(10))
        })

        it('at the end should be 10', async function(){
            await increaseTime(day * 30 - 10) // End after 30 days
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(10))
        })

        it('after end of ICO duration should be 0', async function(){
            await increaseTime(day * 30 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(0))
        })
    })
  
    describe('setting token exchange rate', function () {
        it('should accept rate', async function() {
            await this.violaCrowdSaleInstance.setRate(10)
            let rate = await this.violaCrowdSaleInstance.rate.call()
            rate.should.be.bignumber.equal(new BigNumber(10))
        })

        it('should not accept 0 rate', async function() {
            await this.violaCrowdSaleInstance.setRate(0).should.be.rejectedWith('revert')
        })
    })

    describe('getting tokens', function () {
        it('should get tokens left', async function() {          
            let tokens = await this.violaCrowdSaleInstance.getTokensLeft.call()
            tokens.should.be.bignumber.equal(initialTokens)
        })
    })

    describe('setting min/max cap', function () {
        it('should allow to set min > 0 and < max', async function () {
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei('0.1', 'ether'), web3.toWei('20', 'ether') )
        })

        it('should not allow to set min > max', async function () {
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei('20', 'ether'), web3.toWei('1', 'ether') ).should.be.rejectedWith('revert')
        })

        it('should allow to set min cap = 0', async function () {
            await this.violaCrowdSaleInstance.setCapWeiToPurchase(web3.toWei(0, 'ether'), web3.toWei(1, 'ether'))
        })

        it('should get min cap', async function () {
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei(0.1, 'ether'), web3.toWei(20, 'ether') )
            let min = await this.violaCrowdSaleInstance.minWeiToPurchase.call()
            await min.should.be.bignumber.equal( web3.toWei(0.1, 'ether') )
        })

        it('should get max cap', async function () {
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei(0.1, 'ether'), web3.toWei(20, 'ether') )
            let max = await this.violaCrowdSaleInstance.maxWeiToPurchase.call()
            max.should.be.bignumber.equal( web3.toWei(20, 'ether') )
        })

    })

    describe('buying token', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei(0.1, 'ether'), web3.toWei(20, 'ether') )
        })
        
        it('should receive ETH funds in contract', async function () {
            let beforeFund = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})       
            let afterFund = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })

        it('should not buy when contract is paused', async function () {
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when contract has ended', async function() {
            await this.violaCrowdSaleInstance.endCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when contract is completed', async function () {
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()
            await this.violaCrowdSaleInstance.completeCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when insufficient token', async function () {
            let tokens = await this.violaCrowdSaleInstance.getTokensLeft.call()
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[2], tokens, 0, web3.toWei('3', 'ether'))
            expect(() => web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('3', 'ether')})).to.throw('revert')
        })

        it('should buy if contribution = min amount', async function () {
            await web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000, value: web3.toWei(0.1, 'ether')})
        })

        it('should buy if contribution = max amount', async function () {
            await web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000, value: web3.toWei(20, 'ether')})
        })

        it('should buy if contribution > min and < max amount', async function () {
            await web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000, value: web3.toWei(19, 'ether')})
        })

        it('should not buy below min amount', async function () {
            expect(() => web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000, value: web3.toWei(0.09, 'ether')})).to.throw('revert')
        })

        it('should not buy above max amount', async function () {
            expect(() => web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000, value: web3.toWei(21, 'ether')})).to.throw('revert')
        })

    })
    
    describe('allocating tokens', function() {
        let buyAmount = 1;
        let tokens = web3.toWei(100, 'ether');
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setCapWeiToPurchase( web3.toWei(0.1, 'ether'), web3.toWei(20, 'ether') )
        })

        it('should receive 20% bonus tokens on day 1', async function() {
            let bonusTokens = web3.toWei(buyAmount * 0.2 * rate, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.2 * rate, 'ether'))
        })

        it('should receive 15% bonus tokens on day 2-3', async function() {
            await increaseTime(day * 1 + 1)
            let bonusTokens = web3.toWei(buyAmount * 0.15 * rate, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.15 * rate, 'ether'))
        })

        it('should receive 10% bonus tokens on day 4', async function() {
            await increaseTime(day * 4 + 1)
            let bonusTokens = web3.toWei(buyAmount * 0.1 * rate, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.1 * rate, 'ether'))
        })

        it('should receive 0% bonus tokens on day 11', async function() {
            await increaseTime(day * 10 + 1)
            let bonusTokens = web3.toWei(buyAmount * 0 * rate, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0 * rate, 'ether'))
        })

        it('should tally total tokens when using fiat and eth', async function () {
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('3', 'ether'))
            let totalTokens = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])
            let expectedTokens = new BigNumber(web3.toWei(1, 'ether')).add(web3.toWei(1, 'ether'))
            totalTokens.should.be.bignumber.equal(expectedTokens)
        })

        it('should tally total bonus tokens when using fiat and eth', async function () {
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('3', 'ether'))
            let totalTokens = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate()
            let expectedTokens = new BigNumber(web3.toWei('1', 'ether')).add(web3.toWei(1, 'ether'))
            totalTokens.should.be.bignumber.equal(expectedTokens)
        })

        it('should update total allocated tokens when purchased externally', async function () {
            let initialTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[2], web3.toWei('70', 'ether'), web3.toWei('10', 'ether'), web3.toWei('3', 'ether'))       
            let finalTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            let diff = finalTokens.minus(initialTokens)
            diff.should.be.bignumber.equal(web3.toWei(80, 'ether'))
        })

        it('should update total allocated tokens when purchased internally', async function () {
            let initialTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            await web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[2], web3.toWei('70', 'ether'), web3.toWei('10', 'ether'), web3.toWei('10', 'ether'))
            let finalTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            let diff = finalTokens.minus(initialTokens)
            diff.should.be.bignumber.equal(web3.toWei(80, 'ether'))
        })

        it('should allocate tokens with new purchaseID', async function() {
            let bonusTokens = web3.toWei('10', 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
        })

        it('should not allocate tokens with the duplicate purchaseID', async function() {
            let bonusTokens = web3.toWei('10', 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether')).should.be.rejectedWith('revert')
        })
    })

    describe('distributing ETH/BTC purchased tokens', function () {
        let buyAmount = 1;
        let tokens = web3.toWei(100, 'ether');
        let bonusTokens = web3.toWei(10, 'ether');
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], tokens, bonusTokens, web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.endCrowdsale()
        })

        it('should distribute paid tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.distributeTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(web3.toWei(buyAmount * rate, 'ether'))
        })

        it('should distribute bonus tokens', async function () {
            await increaseTime(day * 180)
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let bonusAllocated = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(bonusAllocated)
        })

        it('should not distrubte bonus tokens before vesting period', async function () {
            await increaseTime(day * 20)         
            await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[1]).should.be.rejectedWith('revert')
        })
    })

    describe('distributing FIAT purchased tokens', function () {
        let buyAmount = 1;
        let tokens = web3.toWei(100, 'ether');
        let bonusTokens = web3.toWei(10, 'ether');
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], tokens, bonusTokens, web3.toWei('3', 'ether'))
            await this.violaCrowdSaleInstance.endCrowdsale()
        })

        it('should distribute paid tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let tokensAllocated = await this.violaCrowdSaleInstance.externalTokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.distributeExternalTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(tokensAllocated)
        })

        it('should distribute bonus tokens', async function () {
            await increaseTime(day * 180)
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let bonusAllocated = await this.violaCrowdSaleInstance.externalBonusTokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.distributeExternalBonusTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(bonusAllocated)
        })

        it('should not distribute external bonus tokens before vesting period', async function () {
            await increaseTime(day * 20)         
            await this.violaCrowdSaleInstance.distributeExternalBonusTokens(accounts[1]).should.be.rejectedWith('revert')
        })
    })

    describe ('special cases', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
        })

        it('tokens should match after external refund', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000, value: buyAmt})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei('1', 'ether'), web3.toWei('1', 'ether'), web3.toWei('3', 'ether'))
            await this.violaCrowdSaleInstance.refundExternalPurchase(accounts[1])
            let tokensAllocatedLeft = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])        
            tokensAllocatedLeft.should.be.bignumber.equal(web3.toWei(1, 'ether'))
        })

        it('bonus tokens should match after external refund', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate.call()
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], web3.toWei(1, 'ether'), web3.toWei(1, 'ether'), web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt, web3.toWei('3', 'ether'))
            await this.violaCrowdSaleInstance.refundExternalPurchase(accounts[1])
            let bonusTokensAllocated = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            bonusTokensAllocated.should.be.bignumber.equal(web3.toWei(1, 'ether'))
        })

        it('total tokens should match after external refund', async function () {
            let initialBalance = web3.eth.getBalance(accounts[1])
            let buyAmt = web3.toWei(1, 'ether')
            
            // Buy external tokens
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt, web3.toWei('3', 'ether'))

            // Buy using eth
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt}) 
            await this.violaCrowdSaleInstance.allocateTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt, web3.toWei('10', 'ether'))  

            await this.violaCrowdSaleInstance.refundExternalPurchase(accounts[1])
      

            //Calculate tokens remainding
            let shouldHaveTokens = new BigNumber(extPurchaseTokenAmt).add(extBonusPurchaseTokenAmt).add(extPurchaseTokenAmt).add(extBonusPurchaseTokenAmt).minus(extPurchaseTokenAmt).minus(extBonusPurchaseTokenAmt)
            let tokensAllocated = await this.violaCrowdSaleInstance.getTotalTokensByAddress(accounts[1])
            
            //Check remainding tokens
            tokensAllocated.should.be.bignumber.equal(shouldHaveTokens)
        })
        
    })
})

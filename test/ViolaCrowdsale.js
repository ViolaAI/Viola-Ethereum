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
        it('should initialize with PendingStart status', async function () {
            let state = await this.violaCrowdSaleInstance.status.call();
            state.should.be.bignumber.equal(new BigNumber(State.PendingStart))
        })

        it('should not initialize from pending start', async function () {
            const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
            const wallet = accounts[0]

            await this.violaCrowdSaleInstance.initialiseCrowdsale(startTime, rate, this.violaTokenInstance.address, wallet).should.be.rejectedWith('revert')
        })
    })

    describe('starting crowdsale', function () {
        it('should start crowdsale from PendingStart status', async function () {
            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdsale()
        })

        it('should not start crowdsale in Active status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdsale()
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

        it('should decrease contract allowance', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            let initialSupply = await this.violaTokenInstance.totalSupply.call()
            let allowedTokens = await this.violaTokenInstance.allowance(accounts[0], this.violaCrowdSaleInstance.address)                        
            await this.violaCrowdSaleInstance.burnExtraTokens()
            let finalSupply = await this.violaTokenInstance.totalSupply.call()
            let totalSupply = finalSupply.add(allowedTokens)
            initialSupply.should.be.bignumber.equal(totalSupply)
        })
    })

    describe('ending crowdsale', function () {
        it('should end crowdsale from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should not end crowdsale from Paused status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not end crowdsale from Ended status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should not end crowdsale from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale().should.be.rejectedWith('revert')
        })

        it('should allow owner to transfer eth partially', async function () {
            await increaseTime(10)
            let transferAmount = new BigNumber(web3.toWei(0.5, 'ether'))
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.approveKYC(accounts[1])
            await this.violaCrowdSaleInstance.partialForwardFunds(transferAmount)
        })

        it('should not allow owner to transfer eth more than non kyc refund funds', async function () {
            await increaseTime(10)
            let transferAmount = new BigNumber(web3.toWei(0.5, 'ether'))
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.partialForwardFunds(transferAmount).should.be.rejectedWith('revert')
        })

        it('should not allow owner to transfer eth more than available fund', async function () {
            await increaseTime(10)
            let transferAmount = new BigNumber(web3.toWei(3, 'ether'))
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.approveKYC(accounts[1])
            await this.violaCrowdSaleInstance.partialForwardFunds(transferAmount).should.be.rejectedWith('revert')
        })
    })

    describe('pausing crowdsale', function () {
        it('should pause crowdsale from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Paused))
        })

        it('should unpause crowdsale from Paused status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            await this.violaCrowdSaleInstance.unpauseCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Active))
        })
    })

    describe('completing crowdsale', function () {

        it('should not end when didnt hit buffer', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1.8', 'ether')})
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Active))
        })

        it('should auto end when hit buffer', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1.9', 'ether')})
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should auto end when sold out', async function () {
            let bufferAmt = web3.toWei(10, 'ether')
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setLeftoverTokensBuffer(bufferAmt)
            await this.violaCrowdSaleInstance.setRate(100)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(0)
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(0)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('2', 'ether')})
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should complete crowdsale from Ended status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()
            await this.violaCrowdSaleInstance.completeCrowdsale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Completed))
        })

        it('should transfer funds when crowdsale ended', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
            let initialAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            await this.violaCrowdSaleInstance.burnExtraTokens()            
            await this.violaCrowdSaleInstance.completeCrowdsale()
            let finalAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            let diff = initialAmount.minus(finalAmount)
            diff.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })
    })

    describe('setting whitelist address', function () {
        it('should accept whitelist address', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], 2000)
            let cap = await this.violaCrowdSaleInstance.maxBuyCap(accounts[1])
            cap.should.be.bignumber.equal(new BigNumber(2000))
        })

        it('should not accept 0 cap', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], 0).should.be.rejectedWith('revert')
        })

        it('should not accept 0x0 address', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(0x0, 2000).should.be.rejectedWith('revert')
        })
    })

    describe('removing whitelist address', function () {
        it('should remove whitelist address', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[1])
            let cap = await this.violaCrowdSaleInstance.maxBuyCap(accounts[1])
            cap.should.be.bignumber.equal(new BigNumber(0))
        })

        it('should refund after removal', async function () {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})
            let amountInvested = await this.violaCrowdSaleInstance.investedSum(accounts[1])
            let beforeFund = web3.eth.getBalance(accounts[1])

            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[1])
            
            let afterFund = web3.eth.getBalance(accounts[1])
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(amountInvested)
        })
    })

    describe('setting bonus token rates', function () {
        let bonusTokenRate = new BigNumber(100)
        it('should update bonus rate for level one', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelOne(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelOne.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should update bonus rate for level two', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelTwo(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelTwo.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should update bonus rate for level three', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelThree(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelThree.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })

        it('should update bonus rate for level four', async function() {
            await this.violaCrowdSaleInstance.setBonusTokenRateLevelFour(bonusTokenRate)
            let newBonusTokenRate = await this.violaCrowdSaleInstance.bonusTokenRateLevelFour.call()
            newBonusTokenRate.should.be.bignumber.equal(bonusTokenRate)
        })
    })
  
    describe('bonus rate', function(){
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
        })
        it('at the beginning of Day 1 should be 20', async function(){
            await increaseTime(10) //after 10 second
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(20))
        })

        it('at the end of Day 1 should be 20', async function(){
            await increaseTime(day * 1 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(20))
        })

        it('at the beginning of Day 2 should be 15', async function(){
            await increaseTime(day * 1 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })

        it('at the end of Day 3 should be 15', async function(){
            await increaseTime(day * 3 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })
        it('at the beginning of Day 4 should be 10', async function(){
            await increaseTime(day * 3 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(10))
        })

        it('at the end of Day 10 should be 10', async function(){
            await increaseTime(day * 10 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(10))
        })
        
        it('at the beginning of Day 11 should be 0', async function(){
            await increaseTime(day * 10 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(0))
        })

        it('at the end should be 0', async function(){
            await increaseTime(day * 30 - 10) // End after 20 days
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(0))
        })

        it('after ending of ICO should be 0', async function(){
            await increaseTime(day * 30 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(0))
        })
    })
  
    describe('setting rate', function () {
        it('should accept rate', async function() {
            await this.violaCrowdSaleInstance.setRate(10)
            let rate = await this.violaCrowdSaleInstance.rate.call()
            rate.should.be.bignumber.equal(new BigNumber(10))
        })

        it('should not accept 0 rate', async function() {
            await this.violaCrowdSaleInstance.setRate(0).should.be.rejectedWith('revert')
        })
    })

    describe('tokens', function () {
        it('should get tokens left', async function() {          
            let tokens = await this.violaCrowdSaleInstance.getTokensLeft.call()
            tokens.should.be.bignumber.equal(initialTokens)
        })
    })

    describe('buying token', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })
        
        it('should transfer funds to contract', async function () {
            let buyAmount = web3.toWei(1, 'ether')
            let beforeFund = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})       
            let afterFund = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })

        it('using fiat and eth should tally total tokens', async function () {
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei('1', 'ether'), web3.toWei('1', 'ether'))
            let totalTokens = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])
            let expectedTokens = new BigNumber(web3.toWei('1', 'ether')).mul(rate).add(web3.toWei(1, 'ether'))
            totalTokens.should.be.bignumber.equal(expectedTokens)
        })

        it('using fiat and eth should tally total bonus tokens', async function () {
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei('1', 'ether'), web3.toWei('1', 'ether'))
            let totalTokens = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate()
            let expectedTokens = new BigNumber(web3.toWei('1', 'ether')).mul(bonusRate).add(web3.toWei(1, 'ether'))
            totalTokens.should.be.bignumber.equal(expectedTokens)
        })

        it('investor should get tokens', async function () {
            var buyAmount = web3.toWei(1, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmount})
            let tokens = await this.violaCrowdSaleInstance.tokensAllocated(accounts[1])
            let buyAmountInBigNumber = new BigNumber(buyAmount)
            tokens.should.be.bignumber.equal(buyAmountInBigNumber.mul(rate))          
        })

        it('non-whitelisted investor should not be able to buy tokens', async function() {
            expect(() => web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')//should.be.rejectedWith('revert')
        })

        it('should not buy when contract has ended', async function() {
            await this.violaCrowdSaleInstance.endCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when contract is paused', async function () {
            await this.violaCrowdSaleInstance.pauseCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when contract is completed', async function () {
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.burnExtraTokens()
            await this.violaCrowdSaleInstance.completeCrowdsale()
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should not buy when insufficient token', async function () {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('3', 'ether'))
            expect(() => web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('3', 'ether')})).to.throw('revert')
        })

        it('should not buy when cap is reached', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('10', 'ether'))
            await web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})
            expect(() => web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei('1', 'ether')})).to.throw('revert')
        })

        it('should update total allocated tokens when purchased externally', async function () {
            let initialTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[2], web3.toWei('70', 'ether'), web3.toWei('10', 'ether'))       
            let finalTokens = await this.violaCrowdSaleInstance.totalTokensAllocated.call()
            let diff = finalTokens.minus(initialTokens)
            diff.should.be.bignumber.equal(web3.toWei(80, 'ether'))
        })
        it('should buy minWei', async function () {
            let minAmount = web3.toWei(0.1, 'ether')
            await this.violaCrowdSaleInstance.setMinWeiToPurchase(minAmount)
            let buyAmount = web3.toWei(0.1, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmount})
        })
        it('should not buy below minWei', async function () {
            let minAmount = web3.toWei(0.1, 'ether')
            await this.violaCrowdSaleInstance.setMinWeiToPurchase(minAmount)
            let buyAmount = web3.toWei(0.09, 'ether')
            expect(() => web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmount})).to.throw('revert')
        })
        it('should buy above minWei', async function () {
            let minAmount = web3.toWei(0.1, 'ether')
            await this.violaCrowdSaleInstance.setMinWeiToPurchase(minAmount)
            let buyAmount = web3.toWei(0.2, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmount})
        })
    })
    
    describe('allocate Tokens', function() {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })

        it('buyer should receive 20% bonus tokens within first days', async function() {
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.2 * rate, 'ether'))
        })

        it('buyer should receive 15% bonus tokens from Day 2', async function() {
            await increaseTime(day * 1 + 1)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.15 * rate, 'ether'))
        })

        it('buyer should receive 10% bonus tokens from Day 4', async function() {
            await increaseTime(day * 4 + 1)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.1 * rate, 'ether'))
        })

        it('buyer should receive 0% bonus tokens from Day 11', async function() {
            await increaseTime(day * 10 + 1)
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0 * rate, 'ether'))
        })
    })

    describe('distributing tokens', function () {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
        })

        it('should distribute ICO tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.distributeICOTokens(accounts[1])
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

    describe('claiming tokens', function () {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
            // await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdsale()
        })

        it('investor should claim ICO tokens', async function () {
            await this.violaCrowdSaleInstance.approveKYC(accounts[1])
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.claimTokens({from:accounts[1]})
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(web3.toWei(buyAmount * rate, 'ether'))
        })

        it('investor should claim bonus tokens', async function () {
            await this.violaCrowdSaleInstance.approveKYC(accounts[1])            
            await increaseTime(day * 180)
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let bonusAllocated = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[1]})
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(bonusAllocated)
        })

        it('investor should not claim bonus tokens before vesting period', async function () {
            await increaseTime(day * 20)         
            await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[1]}).should.be.rejectedWith('revert')
        })
    })

    describe('refunding partially', function () {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(buyAmount, 'ether')})
        })

        it('should not have refund amount more than invested amount', async function () {
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], web3.toWei(2, 'ether'), web3.toWei(1, 'ether'), web3.toWei(1, 'ether')).should.be.rejectedWith('revert')
        })

        it('should not have refund tokens more than allocated tokens', async function () {
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], web3.toWei(0.5, 'ether'), web3.toWei(101, 'ether'), web3.toWei(1, 'ether')).should.be.rejectedWith('revert')
        })

        it('should not have refund bonus tokens more than allocated bonus tokens', async function () {
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], web3.toWei(0.5, 'ether'), web3.toWei(1, 'ether'), web3.toWei(31, 'ether')).should.be.rejectedWith('revert')
        })

        it('should reduce the invested sum by the refund amount', async function () {
            let refundAmount = web3.toWei(0.5, 'ether')
            let initialInvestedSum = await this.violaCrowdSaleInstance.investedSum(accounts[1])
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, web3.toWei(1, 'ether'), web3.toWei(1, 'ether'))
            let finalInvestedSum = await this.violaCrowdSaleInstance.investedSum(accounts[1])
            let diff = initialInvestedSum.minus(finalInvestedSum)
            diff.should.be.bignumber.equal(refundAmount)
        })

        it('should reduce tokens allocated sum by the refund token amount', async function () {
            let refundAmount = web3.toWei(0.5, 'ether')
            let initialTokensAllocated = await this.violaCrowdSaleInstance.tokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, refundAmount, web3.toWei(1, 'ether'))
            let finalTokensAllocated = await this.violaCrowdSaleInstance.tokensAllocated(accounts[1])
            let diff = initialTokensAllocated.minus(finalTokensAllocated)           
            diff.should.be.bignumber.equal(refundAmount)
        })

        it('should reduce bonus tokens allocated sum by the refund bonus token amount', async function () {
            let refundAmount = web3.toWei(0.5, 'ether')
            let initialTokensAllocated = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, refundAmount, refundAmount)
            let finalTokensAllocated = await this.violaCrowdSaleInstance.bonusTokensAllocated(accounts[1])
            let diff = initialTokensAllocated.minus(finalTokensAllocated)           
            diff.should.be.bignumber.equal(refundAmount)
        })

        it('should have investor receive the refund amount', async function () {
            let refundAmount = web3.toWei(0.5, 'ether')
            let initialBalance = web3.eth.getBalance(accounts[1])
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, refundAmount, refundAmount)
            let finalBalance = web3.eth.getBalance(accounts[1])
            let diff = finalBalance.minus(initialBalance)           
            diff.should.be.bignumber.equal(refundAmount)
        })

        it('should not pass if token distribution has taken place', async function () {
            await this.violaCrowdSaleInstance.endCrowdsale()
            await this.violaCrowdSaleInstance.distributeICOTokens(accounts[1])
            let refundAmount = web3.toWei(0.5, 'ether')
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, web3.toWei(-1, 'ether'), web3.toWei(-1, 'ether')).should.be.rejectedWith('revert')
        })
    })

    describe ('Special cases', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdsale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })

        it('Tokens should match after ext refund after ext + eth purchase', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei('1', 'ether'), web3.toWei('1', 'ether'))
            await this.violaCrowdSaleInstance.refundAllExternalPurchase(accounts[1])
            let tokensAllocatedLeft = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])        
            tokensAllocatedLeft.should.be.bignumber.equal(web3.toWei(1 * rate , 'ether'))
        })

        it('Tokens should match after eth refund after ext + ext purchase', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extPurchaseTokenAmt)
            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[1])
            let tokensAllocatedLeft = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])        
            tokensAllocatedLeft.should.be.bignumber.equal(extPurchaseTokenAmt)
        })

        it('Bonus tokens should match after eth refund after ext + eth purchase', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt)
            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[1])
            let bonusTokensAllocatedLeft = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])        
            bonusTokensAllocatedLeft.should.be.bignumber.equal(extBonusPurchaseTokenAmt)
        })

        it('Bonus tokens should match after ext refund after ext + eth purchase', async function () {
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate.call()
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt)
            await this.violaCrowdSaleInstance.refundAllExternalPurchase(accounts[1])
            let bonusTokensAllocated = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            bonusTokensAllocated.should.be.bignumber.equal(web3.toWei(1 * bonusRate, 'ether'))
        })

        it('Total tokens should match after eth partial refund after ext + eth purchase', async function () {
            let initialBalance = web3.eth.getBalance(accounts[1])
            let refundAmount = web3.toWei(0.5, 'ether')
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            let refundTokenAmount = web3.toWei(0.5 * rate, 'ether')
            let refundBonusTokenAmount = web3.toWei(0.05, 'ether')
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate.call()
            
            //Buy ext
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt)

            //Buy using eth & refund partial
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt})       
            await this.violaCrowdSaleInstance.refundPartial(accounts[1], refundAmount, refundTokenAmount, refundBonusTokenAmount)

            //Calculate tokens remainding
            let shouldHaveTokens = new BigNumber(web3.toWei(1 * rate , 'ether')).add(web3.toWei(1 * bonusRate , 'ether')).add(extPurchaseTokenAmt).add(extBonusPurchaseTokenAmt).minus(refundTokenAmount).minus(refundBonusTokenAmount)
            let tokensAllocated = await this.violaCrowdSaleInstance.getTotalTokensByAddress(accounts[1])

            //Check remainding tokens
            tokensAllocated.should.be.bignumber.equal(shouldHaveTokens)
        })

        it('Total tokens should match after ext partial refund after ext + eth purchase', async function () {
            let initialBalance = web3.eth.getBalance(accounts[1])
            let buyAmt = web3.toWei(1, 'ether')
            let rate = await this.violaCrowdSaleInstance.rate.call()
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate.call()
            
            //Buy external tokens
            let extPurchaseTokenAmt = web3.toWei(10, 'ether')
            let extBonusPurchaseTokenAmt = web3.toWei(5, 'ether')
            let refundTokenAmount = web3.toWei(5, 'ether')
            let refundBonusTokenAmount = web3.toWei(2.5, 'ether')
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], extPurchaseTokenAmt, extBonusPurchaseTokenAmt)

            // Buy using eth
            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: buyAmt}) 

            await this.violaCrowdSaleInstance.refundExternalPurchase(accounts[1], refundTokenAmount, refundBonusTokenAmount)
      

            //Calculate tokens remainding
            let shouldHaveTokens = new BigNumber(web3.toWei(1 * rate , 'ether')).add(web3.toWei(1 * bonusRate , 'ether')).add(extPurchaseTokenAmt).add(extBonusPurchaseTokenAmt).minus(refundTokenAmount).minus(refundBonusTokenAmount)
            let tokensAllocated = await this.violaCrowdSaleInstance.getTotalTokensByAddress(accounts[1])
            
            //Check remainding tokens
            tokensAllocated.should.be.bignumber.equal(shouldHaveTokens)
        })
        it ('Multiple purchase', async function () {
            let initialBalance = web3.eth.getBalance(accounts[1])
            let initalTokensLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            let currRate = 10
            await this.violaCrowdSaleInstance.setRate(currRate)

            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[3], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[4], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[5], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[6], web3.toWei('2', 'ether'))

            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[1], web3.toWei(10, 'ether'), web3.toWei(7, 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[2], web3.toWei(10, 'ether'), web3.toWei(7, 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[3], web3.toWei(10, 'ether'), web3.toWei(7, 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[4], web3.toWei(10, 'ether'), web3.toWei(7, 'ether'))
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[5], web3.toWei(10, 'ether'), web3.toWei(7, 'ether'))

            //Check tokens left value is reduced correctly via external purchase
            let afterExternalTokenPurchase = await this.violaCrowdSaleInstance.getTokensLeft.call()
            let result = initalTokensLeft.minus(web3.toWei(17 * 5, 'ether'))
            assert.equal(afterExternalTokenPurchase.valueOf(), result.valueOf(),'External tokens did not deduct correctly')

            await web3.eth.sendTransaction({from: accounts[1], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await web3.eth.sendTransaction({from: accounts[2], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await web3.eth.sendTransaction({from: accounts[3], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')}) 
            await web3.eth.sendTransaction({from: accounts[4], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')}) 
            await web3.eth.sendTransaction({from: accounts[5], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})
            await web3.eth.sendTransaction({from: accounts[6], to: this.violaCrowdSaleInstance.address, gas: 200000,value: web3.toWei(1, 'ether')})

            //Check tokens left value is reduced correctly via eth purchase
            let currentTokenLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            result = result.minus(web3.toWei(1.2 * currRate * 6, 'ether'))
            assert.equal(currentTokenLeft.valueOf(), result.valueOf(),'get tokens left has not reduced correctly')

            //Check token balance after refund external purchase is correct
            let beforeCheckNormalToken = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])
            let beforeCheckBonusToken = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            await this.violaCrowdSaleInstance.refundExternalPurchase(accounts[1], web3.toWei(7, 'ether'), web3.toWei(5, 'ether'))

            //Check bonus token balance after refund external purchase is correct
            let toCheck = await this.violaCrowdSaleInstance.getTotalNormalTokensByAddress(accounts[1])
            assert.equal(toCheck.valueOf(), beforeCheckNormalToken.sub( web3.toWei(7, 'ether')).valueOf(),'Refund external purchase normal token check failed')
            toCheck = await this.violaCrowdSaleInstance.getTotalBonusTokensByAddress(accounts[1])
            assert.equal(toCheck.valueOf(), beforeCheckBonusToken.sub( web3.toWei(5, 'ether')).valueOf(),'Refund external purchase bonus token check failed')

            //Check current token left value again after partial external refunds
            currentTokenLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            result = result.add(web3.toWei(12, 'ether'))
            assert.equal(currentTokenLeft.valueOf(), result.valueOf(),'Tokens left not added correctly')

            await this.violaCrowdSaleInstance.refundAllExternalPurchase(accounts[2])

            //Check current token left value again after external refunds
            currentTokenLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            result = result.add(web3.toWei(17, 'ether'))
            assert.equal(currentTokenLeft.valueOf(), result.valueOf(),'Tokens left not added correctly')
            
            await this.violaCrowdSaleInstance.refundPartial(accounts[3], web3.toWei(0.5, 'ether'), web3.toWei(5, 'ether'), web3.toWei(1, 'ether'))

            //Check current token left value again after partial refunds
            currentTokenLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            result = result.add(web3.toWei(6, 'ether'))
            assert.equal(currentTokenLeft.valueOf(), result.valueOf(),'Tokens left not subtracted correctly')
            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[4])

            //Check current token left value again after removing whitelist refunds
            currentTokenLeft = await this.violaCrowdSaleInstance.getTokensLeft.call()
            result = result.add(web3.toWei(12, 'ether'))
            assert.equal(currentTokenLeft.valueOf(), result.valueOf(),'Tokens left not subtracted correctly')            
            
            await this.violaCrowdSaleInstance.endCrowdsale()

            await this.violaCrowdSaleInstance.approveKYC(accounts[1])
            await this.violaCrowdSaleInstance.approveKYC(accounts[2])
            await this.violaCrowdSaleInstance.approveKYC(accounts[3])
            await this.violaCrowdSaleInstance.approveKYC(accounts[4])

            await this.violaCrowdSaleInstance.approveKYC(accounts[5])
            await this.violaCrowdSaleInstance.revokeKYC(accounts[5])

            await this.violaCrowdSaleInstance.approveKYC(accounts[6])
            await this.violaCrowdSaleInstance.revokeKYC(accounts[6])
            toCheck = await this.violaCrowdSaleInstance.getTotalTokensByAddress(accounts[6])
            assert.equal(toCheck.valueOf(), 0,'Revoke KYC did not clear tokens left')

            await this.violaCrowdSaleInstance.partialForwardFunds(web3.toWei(1, 'ether'));

            await this.violaCrowdSaleInstance.claimTokens({from:accounts[1]})
            await this.violaCrowdSaleInstance.claimTokens({from:accounts[2]})
            await this.violaCrowdSaleInstance.claimTokens({from:accounts[3]})

            await this.violaCrowdSaleInstance.distributeICOTokens(accounts[4]);
            //await this.violaCrowdSaleInstance.claimTokens({from:accounts[5]})

            await increaseTime(60 * day)
            await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[1]})
            await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[2]})
            await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[3]})
            //await this.violaCrowdSaleInstance.claimBonusTokens({from:accounts[5]})
            await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[4]);
            //await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[5]);

        })
    })
})

import increaseTime from './helper/increaseTime'
// Contract to be tested
const ViolaCrowdSale = artifacts.require('ViolaCrowdsale')
const ViolaToken = artifacts.require('ViolaToken')

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
    const day = 86400

    beforeEach(async function () {
        const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 5 // next day
        const endTime = startTime + (day * 20) // 20 days
        const rate = new web3.BigNumber(1)
        const wallet = accounts[0]

        this.violaTokenInstance = await ViolaToken.new();        
        this.violaCrowdSaleInstance = await ViolaCrowdSale.new();
        await this.violaTokenInstance.approve(this.violaCrowdSaleInstance.address, web3.toWei('10', 'ether'))            
        await this.violaCrowdSaleInstance.initaliseCrowdsale(startTime, endTime, rate, rate, this.violaTokenInstance.address, wallet);
    })

    describe('initializing contract', function () {
        it('should initialize with PendingStart status', async function () {
            let state = await this.violaCrowdSaleInstance.status.call();
            state.should.be.bignumber.equal(new BigNumber(State.PendingStart))
        })
    })

    describe('starting crowdsale', function () {
        it('should start crowdsale from PendingStart status', async function () {
            await increaseTime(10)             
            await this.violaCrowdSaleInstance.startCrowdSale()
        })

        it('should not start crowdsale in Active status', async function () {
            await increaseTime(10) 
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.startCrowdSale().should.be.rejectedWith('revert')
        })
    })

    describe('ending crowdsale', function () {
        it('should end crowdsale from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Ended))
        })

        it('should not end crowdsale from Paused status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.pauseCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale().should.be.rejectedWith('revert')
        })

        it('should not end crowdsale from Ended status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale().should.be.rejectedWith('revert')
        })

        it('should not end crowdsale from Completed status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale()
            await this.violaCrowdSaleInstance.completeCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale().should.be.rejectedWith('revert')
        })
    })

    describe('pausing crowdsale', function () {
        it('should pause crowdsale from Active status', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.pauseCrowdSale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Paused))
        })

        it('should unpause crowdsale from Paused status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.pauseCrowdSale()
            await this.violaCrowdSaleInstance.unpauseCrowdSale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Active))
        })
    })

    describe('completing crowdsale', function () {
        it('should complete crowdsale from Ended status', async function () {
            await increaseTime(10)            
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.endCrowdSale()
            await this.violaCrowdSaleInstance.completeCrowdSale()
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(State.Completed))
        })

        it('should transfer funds when crowdsale ended', async function () {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})
            await this.violaCrowdSaleInstance.endCrowdSale()
            let initialAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            await this.violaCrowdSaleInstance.completeCrowdSale()
            let finalAmount = web3.eth.getBalance(this.violaCrowdSaleInstance.address)
            let diff = initialAmount.minus(finalAmount)
            diff.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })
    })

    describe('setting whitelist address', function () {
        it('should accept whitelist address', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], 2000)
            let cap = await this.violaCrowdSaleInstance.getAddressCap(accounts[1])
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
            let cap = await this.violaCrowdSaleInstance.getAddressCap(accounts[1])
            cap.should.be.bignumber.equal(new BigNumber(0))
        })

        it('should refund after removal', async function () {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})
            let amountInvested = await this.violaCrowdSaleInstance.getAddressAmtInvested(accounts[1])
            let beforeFund = web3.eth.getBalance(accounts[1])

            await this.violaCrowdSaleInstance.removeWhitelistAddress(accounts[1])
            
            let afterFund = web3.eth.getBalance(accounts[1])
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(amountInvested)
        })
    })
  
    describe('bonus rate', function(){
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
        })
        it('at the beginning of Day 1 should be 30', async function(){
            await increaseTime(10) //after 10 second
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(30))
        })

        it('at the end of Day 2 should be 30', async function(){
            await increaseTime(day * 2 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(30))
        })

        it('at the beginning of Day 3 should be 15', async function(){
            await increaseTime(day * 2 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })

        it('at the end of Day 10 should be 15', async function(){
            await increaseTime(day * 10 - 10)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(15))
        })
        
        it('at the beginning of Day 11 should be 8', async function(){
            await increaseTime(day * 10 + 1)
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(8))
        })

        it('at the end should be 8', async function(){
            await increaseTime(day * 20 - 10) // End after 20 days
            let bonusRate = await this.violaCrowdSaleInstance.getTimeBasedBonusRate();
            await bonusRate.should.be.bignumber.equal(new BigNumber(8))
        })

        it('after ending of ICO should be 0', async function(){
            await increaseTime(day * 20 + 1)
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
            tokens.should.be.bignumber.equal(web3.toWei('10', 'ether'))
        })
    })

    describe('buying token', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })
        
        it('should transfer funds to contract', async function () {
            let contractAddress = this.violaCrowdSaleInstance.address
            let beforeFund = web3.eth.getBalance(contractAddress)
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})

            let afterFund = web3.eth.getBalance(contractAddress)
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(web3.toWei('1', 'ether'))
        })

        it('investor should get tokens', async function () {
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})
            let tokens = await this.violaCrowdSaleInstance.getAddressAllocatedTokens(accounts[1])
            tokens.should.be.bignumber.equal(web3.toWei('1', 'ether'))          
        })

        it('non-whitelisted investor should not be able to buy tokens', async function() {
            await this.violaCrowdSaleInstance.buyTokens(accounts[2], {from: accounts[2], value: web3.toWei('1', 'ether')}).should.be.rejectedWith('revert')
        })

        it('should not buy when contract has ended', async function() {
            await this.violaCrowdSaleInstance.endCrowdSale()
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')}).should.be.rejectedWith('revert')            
        })

        it('should not buy when contract is paused', async function () {
            await this.violaCrowdSaleInstance.pauseCrowdSale()
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')}).should.be.rejectedWith('revert')                        
        })

        it('should not buy when contract is completed', async function () {
            await this.violaCrowdSaleInstance.endCrowdSale()
            await this.violaCrowdSaleInstance.completeCrowdSale()
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')}).should.be.rejectedWith('revert')                        
        })

        it('should not buy when insufficient token', async function () {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[2], {from: accounts[2], value: web3.toWei('10', 'ether')}).should.be.rejectedWith('revert')
        })

        it('should not buy when cap is reached', async function() {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[2], {from: accounts[2], value: web3.toWei('4', 'ether')})
            await this.violaCrowdSaleInstance.buyTokens(accounts[2], {from: accounts[2], value: web3.toWei('4', 'ether')}).should.be.rejectedWith('revert')  
        })

        it('should not buy using fiat when cap reached', async function () {
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[2], web3.toWei('10', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[2], {from: accounts[2], value: web3.toWei('4', 'ether')})
            await this.violaCrowdSaleInstance.externalPurchaseTokens(accounts[2], web3.toWei('6', 'ether'), web3.toWei('1', 'ether')).should.be.rejectedWith('revert')  
        })
    })

    describe('refunding', function () {
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })

        it('receiver should get ether', async function() {
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei('1', 'ether')})
            let amountInvested = await this.violaCrowdSaleInstance.getAddressAmtInvested(accounts[1])
            let beforeFund = web3.eth.getBalance(accounts[1])  

            await this.violaCrowdSaleInstance.refund(accounts[1])
            
            let afterFund = web3.eth.getBalance(accounts[1])
            let diffBalance = afterFund.minus(beforeFund)
            diffBalance.should.be.bignumber.equal(amountInvested)
        })
    })
    
    describe('allocate Tokens', function() {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
        })

        it('buyer should receive 30% bonus tokens within 2 first days', async function() {
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.getAddressBonusAllocatedTokens(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.3, 'ether'))
        })

        it('buyer should receive 15% bonus tokens from Day 3', async function() {
            await increaseTime(day * 2 + 1)
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.getAddressBonusAllocatedTokens(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.15, 'ether'))
        })

        it('buyer should receive 15% bonus tokens from Day 11', async function() {
            await increaseTime(day * 10 + 1)
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            let bonusToken = await this.violaCrowdSaleInstance.getAddressBonusAllocatedTokens(accounts[1])
            bonusToken.should.be.bignumber.equal(web3.toWei(buyAmount * 0.08, 'ether'))
        })
    })

    describe('reserving tokens', function () {
        it('should reserve presale tokens', async function () {
            await this.violaCrowdSaleInstance.reserveTokens(web3.toWei('5', 'ether'))
            let tokensLeft = await this.violaCrowdSaleInstance.getTokensLeft()
            tokensLeft.should.be.bignumber.equal(web3.toWei('5', 'ether'))
        })

        it('should not reserve presale tokens more than allowed tokens', async function () {
            await this.violaCrowdSaleInstance.reserveTokens(web3.toWei('100', 'ether')).should.be.rejectedWith('revert')
        })
    })

    describe('distributing tokens', function () {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdSale()
        })

        it('should distribute ICO tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.distributeICOTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(web3.toWei(buyAmount, 'ether'))
        })

        it('should distribute bonus tokens', async function () {
            await increaseTime(day * 180)
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let bonusAllocated = await this.violaCrowdSaleInstance.getAddressBonusAllocatedTokens(accounts[1])            
            await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[1])
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(bonusAllocated)
        })

        it('should not distrubte bonus tokens before vesting period', async function () {
            await increaseTime(day * 20)         
            await this.violaCrowdSaleInstance.distributeBonusTokens(accounts[1]).should.be.rejectedWith('revert')
        })

        it('should distribute presale tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.distributePresaleTokens(accounts[1], web3.toWei(buyAmount, 'ether'))
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(web3.toWei(buyAmount, 'ether'))
        })
    })

    describe('claiming tokens', function () {
        let buyAmount = 1;
        beforeEach(async function() {
            await increaseTime(10)
            await this.violaCrowdSaleInstance.startCrowdSale()
            await this.violaCrowdSaleInstance.setWhitelistAddress(accounts[1], web3.toWei('2', 'ether'))
            await this.violaCrowdSaleInstance.buyTokens(accounts[1], {from: accounts[1], value: web3.toWei(buyAmount, 'ether')})
            await this.violaCrowdSaleInstance.endCrowdSale()
        })

        it('investor should claim ICO tokens', async function () {
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            await this.violaCrowdSaleInstance.claimTokens({from:accounts[1]})
            let afterTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let diff = afterTokens.minus(beforeTokens)
            diff.should.be.bignumber.equal(web3.toWei(buyAmount, 'ether'))
        })

        it('investor should claim bonus tokens', async function () {
            await increaseTime(day * 180)
            let beforeTokens = await this.violaTokenInstance.balanceOf(accounts[1])
            let bonusAllocated = await this.violaCrowdSaleInstance.getAddressBonusAllocatedTokens(accounts[1])            
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
})

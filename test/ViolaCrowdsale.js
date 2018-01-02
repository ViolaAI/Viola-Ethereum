
// Contract to be tested
const ViolaCrowdSale = artifacts.require('ViolaCrowdsale')
const ViolaToken = artifacts.require('ViolaToken')

const BigNumber = web3.BigNumber

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should()

// Test suite
contract('ViolaCrowdsale', function (accounts) {

    const gasAmount = web3.toWei(1, 'ether')

    beforeEach(async function () {
        const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1 // one second in the future
        const endTime = startTime + (86400 * 20) // 20 days
        const rate = new web3.BigNumber(1)
        const wallet = accounts[0]

        this.violaCrowdSaleInstance = await ViolaCrowdSale.new(startTime, endTime, rate, wallet);
        this.violaTokenInstance = await ViolaToken.new(100);
    })

    describe('initializing contract', function () {
        it('should initialize with Preparing status', async function () {
            let state = await this.violaCrowdSaleInstance.status.call();
            state.should.be.bignumber.equal(new BigNumber(0))
        })
    })

    describe('setting token address', function () {
        it('should accept token address', async function () {
            await this.violaCrowdSaleInstance.setToken(this.violaTokenInstance.address)
            let token = await this.violaCrowdSaleInstance.myToken.call()
            token.should.equal(token)
        })

        it('should not accept null token address', async function () {
            await this.violaCrowdSaleInstance.setToken(0).should.be.rejectedWith('revert')
        })

        it('should go to NotStarted state after accepting token', async function () {
            await this.violaCrowdSaleInstance.setToken(this.violaTokenInstance.address)
            let state = await this.violaCrowdSaleInstance.status.call()
            state.should.be.bignumber.equal(new BigNumber(1))
        })

        it('should accept token only in Preparing status', async function () {
            await this.violaCrowdSaleInstance.setToken(this.violaTokenInstance.address)
            //status is now NotStarted
            await this.violaCrowdSaleInstance.setToken(this.violaCrowdSaleInstance.address).should.be.rejectedWith('revert')
        })
    })

    describe('starting crowdsale', function () {
        beforeEach(async function() {
            await this.violaCrowdSaleInstance.setToken(this.violaTokenInstance.address)
        })
    })
})
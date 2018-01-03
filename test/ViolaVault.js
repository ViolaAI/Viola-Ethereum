// Contract to be tested
const ViolaVault = artifacts.require('ViolaVault')

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('ViolaVault', function (accounts) {
  beforeEach(async function () {
    const wallet = accounts[0]
  
    this.violaVaultInstance = await ViolaVault.new(wallet);
  })

  describe('initializing vault', function() {
    it('should have Active state', async function() {
      let state = await this.violaVaultInstance.state.call()
      state.should.be.bignumber.equal(new BigNumber(0))
    })
  })

  describe('closing vault', function () {
    it('should be able to close vault', async function() {
      await this.violaVaultInstance.close()
      let state = await this.violaVaultInstance.state.call()
      state.should.be.bignumber.equal(new BigNumber(1))
    })
  })

  describe('depositing', function() {
    it('should be able to deposit', async function() {
      await this.violaVaultInstance.deposit(accounts[1], {from:accounts[0], value: web3.toWei('1', 'ether')})
      let value = await this.violaVaultInstance.getDeposited(accounts[1])
      value.should.be.bignumber.equal(web3.toWei('1', 'ether'))
    })

    it('should only deposit in Active state', async function() {
      await this.violaVaultInstance.close()
      await this.violaVaultInstance.deposit(accounts[1], {from:accounts[0], value: web3.toWei('1', 'ether')}).should.be.rejectedWith('revert')
    })
  })

  describe('refunding', function() {
    it('should be able to refund', async function() {
      await this.violaVaultInstance.deposit(accounts[1], {from:accounts[0], value: web3.toWei('1', 'ether')})
      let initialBalance = web3.eth.getBalance(accounts[1])

      await this.violaVaultInstance.refund(accounts[1])
      let balance = web3.eth.getBalance(accounts[1])
      let transferred = balance.minus(initialBalance)
      transferred.should.be.bignumber.equal(web3.toWei('1', 'ether'))
    })

    it('should only refund in Active state', async function() {
      await this.violaVaultInstance.deposit(accounts[1], {from:accounts[0], value: web3.toWei('1', 'ether')})
      
      await this.violaVaultInstance.close()
      await this.violaVaultInstance.refund(accounts[1]).should.be.rejectedWith('revert')
    })
  })
})

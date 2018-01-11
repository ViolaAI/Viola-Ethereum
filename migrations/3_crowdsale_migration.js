var ViolaCrowdSale = artifacts.require("./ViolaCrowdSale.sol")

module.exports = function(deployer) {
  // const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1 // one second in the future
  // const endTime = startTime + (86400 * 20) // 20 days
  // const rate = new web3.BigNumber(100)
  // const bonusRate = new web3.BigNumber(50)
  // const wallet = accounts[0]

  // deployer.deploy(ViolaCrowdSale, startTime, endTime, rate, bonusRate, wallet)
  deployer.deploy(ViolaCrowdSale);
};
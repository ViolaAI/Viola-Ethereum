var ViolaCrowdSale = artifacts.require("./ViolaCrowdSale.sol")

module.exports = function(deployer) {
  deployer.deploy(ViolaCrowdSale);
};
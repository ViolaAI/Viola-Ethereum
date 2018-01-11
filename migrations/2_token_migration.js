var Migrations = artifacts.require("./TokenERC20.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
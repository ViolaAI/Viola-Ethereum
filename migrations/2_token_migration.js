var Migrations = artifacts.require("./ViolaToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
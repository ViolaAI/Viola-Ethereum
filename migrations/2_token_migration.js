var Migrations = artifacts.require("./VLTToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
var config = require('./config');

var PrivateKeyProvider = require("truffle-privatekey-provider");
var privateKey = config.privatekey;
var infura_apikey = config.infura_apikey;

require('babel-register')

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "1"
    },
    rinkeby: {
      provider: new PrivateKeyProvider(privateKey, "https://rinkeby.infura.io/" + infura_apikey),
      network_id: "2"
    }, 
    mainnet: {
      provider: new PrivateKeyProvider(privateKey, "https://mainnet.infura.io/" + infura_apikey),
      gas: 6700000,
      gasPrice: 20000000000,
      network_id: "3"
    }
  }
};

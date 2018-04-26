var config = require('./config');

var PrivateKeyProvider = require("truffle-privatekey-provider");
var privateKey = config.privatekey;
var provider_url = config.provider_url + config.infura_apikey;

require('babel-register')

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "1"
    },
    rinkeby: {
      provider: new PrivateKeyProvider(privateKey, provider_url),
      network_id: "2"
    }
  }
};

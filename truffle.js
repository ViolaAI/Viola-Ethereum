
var PrivateKeyProvider = require("truffle-privatekey-provider");
var privateKey = "YOUR WALLET PRIVATE KEY";
var infura_apikey = "YOUR API KEY";

require('babel-register')
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "1"
    },
    rinkeby: {
      provider: new PrivateKeyProvider(privateKey, "https://rinkeby.infura.io/"+infura_apikey),
      network_id: "2"
    }
  }
};

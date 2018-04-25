var PrivateKeyProvider = require("truffle-privatekey-provider");
var privateKey = "b9b927a489cd61c6d5ca2bea1578529f362f91e942f717eb31652f56329d7e90"; // test wallet
var infura_apikey = "pY06PzI33RGJ7FVNoaCP";

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

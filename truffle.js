
var HDWalletProvider = require("truffle-hdwallet-provider");

var infura_apikey = "19pY4PqOcBt5YqwjUMbr";
var mnemonic = "guide little real comfort mosquito judge build person remain rural duck mercy";


require('babel-register')
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "1"
     },
     rinkeby: {
      provider: new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/"+infura_apikey),
      network_id: "2",
      gas: 5000000
    }
    }
};

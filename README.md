# Viola-Ethereum

Smart contracts for Viola.AI crowdsale

## Prerequisites

You will need to have the following software installed

- [Node JS](https://nodejs.org/en/) version 8.9.3
- [Truffle](http://truffleframework.com/) version 4.0.3
- [Ganache-cli](https://github.com/trufflesuite/ganache-cli) version 6.0.3

## Getting Started
Clone this repository. Change directory to this project folder
```
$ cd Viola-Ethereum
```
Install dependencies
```
$ npm install
```
## Testing on Mac
Before you start testing, you need to ensure that ganache-cli is installed.

In the project folder, run the following command
```
$ npm test
```
Remember to make shell script executable by running `chmod u+x ./scripts/test.sh`

## Testing on Windows
If you are running on Windows, you may need to manually start ganache-cli.
```
$ ganache-cli
```

Afterwhich, you can run the following on a new command line window:
```
$ truffle test
```

## Deployment to Rinkeby
### Infura
This project uses Infura to access Ethereum network. As such you will need to obtain an API key to connect to Infura APIs. If you do not have an API key, you may sign up on their [website](https://infura.io/).

### Wallet
You will also need a wallet with some Ether that will be used for the deployment gas fee. You can use MyEtherWallet to generate your wallet.

### Deployment
Open the truffle.js in the project root directory. You will find the following code:

```
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
      network_id: "2",
    }
  }
};
```
Replace the `privateKey` and `infura_apiKey` with your own keys.

Compile contracts
```
truffle compile
```
Migrate to Rinkeby
```
truffle migrate --network rinkeby
```

## Compiling with Remix
To compile in Remix, we first need to flatten the contract codes into one file.
We can use the following program to help us with that.

```
clone git@github.com:poanetwork/oracles-combine-solidity.git
cd /oracles-combine-solidity
npm install
npm start <path to Viola project>/contracts/ViolaCrowdsale.sol
```
The output file `ViolaCrowdsale_flat.sol` can be found in `out` folder

## Built With

- [Zeppelin-Solidity](https://openzeppelin.org/) version 1.4.0

## Acknowledgments

* Hat tip to anyone who's code was used
* Inspiration
* etc

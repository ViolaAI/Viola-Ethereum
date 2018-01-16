# Voila-Ethereum

Smart contracts for Voila crowdsale

## Prerequisites

You will need to have the following softwares installed

- [Node JS](https://nodejs.org/en/) version 8.9.3
- [Truffle](http://truffleframework.com/) version 4.0.3
- [Ganache-cli](https://github.com/trufflesuite/ganache-cli) version 6.0.3

## Getting Started
Clone this repository. Change directory to this project folder
```
cd Viola-Ethereum
```
Install dependencies
```
npm install
```
## Test
Open a new terminal and run ganache-cli
```
ganache-cli
```
In the project folder, run the following command
```
truffle test
```
## Deployment to Rinkeby
Compile contracts
```
truffle compile
```
Migrate to Rinkeby
```
truffle migrate --network rinkeby
```

## Built With

- [Zeppelin-Solidity](https://openzeppelin.org/) version 1.4.0

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/2359media/viola-ethereum/tags). 

## Acknowledgments

* Hat tip to anyone who's code was used
* Inspiration
* etc

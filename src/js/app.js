const State = {
  Deployed: 0,
  PendingStart: 1,
  Active: 2,
  Paused: 3,
  Ended: 4,
  Completed: 5
}

App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,
  crowdsaleAddress: '0xfac4dffc111b80767cc8b6c322ac59262e1052dd',
  tokenAddress: '0x1e7a6125add92d6d249e72507dec65c68b738baa',

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      // Use Mist/MetaMask's provider
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }
    App.initContract();
    App.displayAccountInfo()
  },

  displayAccountInfo: function () {
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $("#accountField").text(account);
        web3.eth.getBalance(account, function (err, balance) {
          if (err === null) {
            $("#accountBalanceField").text(web3.fromWei(balance, "ether") + " ETH");
          }
        });
      }
    });
  },

  initContract: function () {
    $.getJSON('ViolaCrowdsale.abi', function (crowdsaleArtifact) {
      App.contracts.Crowdsale = web3.eth.contract(crowdsaleArtifact).at(App.crowdsaleAddress);
      App.displayStatus()
      App.listenToEvents();
    });

    $.getJSON('ViolaToken.abi', function (tokenArtifact) {
      App.contracts.Token = web3.eth.contract(tokenArtifact).at(App.tokenAddress)
    });
  },

  displayStatus: function () {
    var status = App.contracts.Crowdsale.status(function (error, result) {
      var status = result.c[0]
      switch (status) {
        case State.Deployed:
          $('#statusField').html('Deployed');
          break;
        case State.PendingStart:
          $('#statusField').html('Pending Start');
          break;
        case State.Active:
          $('#statusField').html('Active');
          break;
        case State.Paused:
          $('#statusField').html('Paused');
          break;
        case State.Ended:
          $('#statusField').html('Ended');
          break;
        case State.Completed:
          $('#statusField').html('Completed');
          break;
      }
    })
  },

  updateStatus: function () {
    var status = $('#updateStatus option:selected').text()
    switch (status) {
      case 'Start':
        App.contracts.Crowdsale.startCrowdSale(function (error, result) { })
        break;
      case 'End':
        App.contracts.Crowdsale.endCrowdSale(function (error, result) { })
        break;
      case 'Pause':
        App.contracts.Crowdsale.pauseCrowdSale(function (error, result) { })
        break;
      case 'Unpause':
        App.contracts.Crowdsale.unpauseCrowdSale(function (error, result) { })
        break;
      case 'Complete':
        App.contracts.Crowdsale.completeCrowdSale(function (error, result) { })
        break;
    }
  },

  buyToken: function () {
    var ethAmount = $('#etherAmount').val();
    var gasPrice = $('#gasPrice').val();
    var ethAmountInWei = web3.toWei(ethAmount, 'ether')
    var gasPriceInGwei = web3.toWei(gasPrice, 'gwei')
    web3.eth.sendTransaction({ from: App.account, to: App.crowdsaleAddress, gasPrice: gasPriceInGwei, value: ethAmountInWei }, function (result, error) {
      if (!error) {
        console.log(result);
      }
    })
  },

  getAddressCap: function () {
    var addressCap = App.contracts.Crowdsale.getAddressCap(App.account, function (error, result) { console.log(web3.fromWei(result, 'ether')) })
    console.log(addressCap)
  },


  claimToken: function () {
    App.contracts.Crowdsale.claimTokens(function (error, result) {
    });
  },

  claimBonusToken: function () {
    App.contracts.Crowdsale.claimBonusTokens(function (error, result) {
    });
  },

  listenToEvents: function () {
    App.contracts.Crowdsale.TokenPurchase(function (error, result) {
    });

    App.contracts.Crowdsale.CrowdsaleEnded(function(error, result){
      App.displayStatus()
    })

    App.contracts.Crowdsale.CrowdsaleStarted(function(error, result){
      App.displayStatus()
    })

    App.contracts.Crowdsale.CrowdsalePending(function(error, result){
      App.displayStatus()
    })
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});

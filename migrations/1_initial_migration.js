const ContractUSDM = artifacts.require('USDM');

module.exports = function (deployer) {
  deployer.deploy(ContractUSDM, { gas: 5000000 });
};

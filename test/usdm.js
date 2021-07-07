const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

const usdm = artifacts.require('usdm');

const web3 = new Web3('http://localhost:7545'); //equal dev environment

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract('usdm', function (accounts) {
  it('should deploy', async function () {
    const token = await usdm.deployed();
    return assert.isTrue(true);
  });

  it('should have a correct owner', async function () {
    const token = await usdm.deployed();

    const owner = await token.owner();

    return assert.equal(owner, accounts[0], 'Wrong owner');
  });

  it('should have a correct standard fee', async function () {
    const token = await usdm.deployed();

    const standardFee = await token.standardFee();

    return assert.equal(standardFee, 10, 'Wrong standard fee');
  });

  it('should have a correct maximum fee', async function () {
    const token = await usdm.deployed();

    const maximumFee = await token.maximumFee();

    return assert.equal(maximumFee, 12e18, 'Wrong maximum fee');
  });

  it('should have a correct owner balance', async function () {
    const token = await usdm.deployed();
    const balance = await web3.eth.getBalance(accounts[0]);

    return assert.isTrue(BigNumber(balance).lt(BigNumber(100e18)));
  });

  it('should let owner change the standard fee', async function () {
    const token = await usdm.deployed();

    const standardFee = await token.standardFee();

    await token.changeStandardFee(web3.utils.toBN(5), { from: accounts[0] });

    const newStandardFee = await token.standardFee();

    await token.changeStandardFee(web3.utils.toBN(10), { from: accounts[0] });

    return assert.isTrue(
      BigNumber(standardFee).isEqualTo(
        BigNumber(web3.utils.toBN(10).toString())
      ) &&
        BigNumber(newStandardFee).isEqualTo(
          BigNumber(web3.utils.toBN(5).toString())
        )
    );
  });

  it('should let only owner change the standard fee', async function () {
    const token = await usdm.deployed();

    let ownerError;

    try {
      await token.changeStandardFee(web3.utils.toBN(5), { from: accounts[2] });
    } catch (error) {
      ownerError = error;
    }

    return assert.isTrue(ownerError && ownerError !== undefined);
  });

  it('should deposit correct amount for an account', async function () {
    const token = await usdm.deployed();

    await token.sendTransaction({
      from: accounts[2],
      value: web3.utils.toBN(1e18),
    });

    const tokenBalance = await token.balanceOf(accounts[2]);

    return assert.isTrue(
      BigNumber(tokenBalance.toString()).isEqualTo(BigNumber(1e18))
    );
  });

  it('should withdraw correct amount for an account', async function () {
    const token = await usdm.deployed();

    const tokenBalance = await token.balanceOf(accounts[2]);

    await token.withdraw(web3.utils.toBN(1e16), {
      from: accounts[2],
    });

    const tokenBalanceNew = await token.balanceOf(accounts[2]);

    return assert.isTrue(
      BigNumber(tokenBalance.toString())
        .minus(BigNumber(tokenBalanceNew.toString()))
        .isEqualTo(BigNumber(web3.utils.toBN(1e16)))
    );
  });

  it('should transfer correct amount for an account', async function () {
    const token = await usdm.deployed();

    const tokenBalance = await token.balanceOf(accounts[3]);

    await token.transfer(accounts[3], web3.utils.toBN(1e17), {
      from: accounts[2],
    });

    const tokenBalanceNew = await token.balanceOf(accounts[3]);

    return assert.isTrue(
      BigNumber(tokenBalanceNew.toString())
        .minus(BigNumber(tokenBalance.toString()))
        .isEqualTo(BigNumber(1e17))
    );
  });

  it('should fail to transfer more than available', async function () {
    const token = await usdm.deployed();

    let transferError;

    try {
      await token.transfer(accounts[2], web3.utils.toBN(100e18), {
        from: accounts[3],
      });
    } catch (error) {
      transferError = error;
    }

    return assert.isTrue(transferError && transferError !== undefined);
  });

  it('should have the correct calculation for business transfer', async function () {
    const token = await usdm.deployed();

    tx = await token.transferBusiness(accounts[3], web3.utils.toBN(1e17), {
      from: accounts[2],
    });

    truffleAssert.eventEmitted(tx, 'TransferBusiness', (event) => {
      const value = BigNumber(event.wad.toString()).isEqualTo(BigNumber(1e17));
      const fee = BigNumber(event.fee.toString()).isEqualTo(
        BigNumber(1e17).times(0.01)
      );
      const total = BigNumber(event.wad.toString())
        .minus(BigNumber(event.fee.toString()))
        .isEqualTo(BigNumber(1e17).minus(BigNumber(1e17).times(0.01)));

      return value === true && fee === true && total === true;
    });
  });

  it('should send a correct fee to fee recipient for a business transaction', async function () {
    const token = await usdm.deployed();

    const tokenBalance = await token.balanceOf(accounts[0]);

    await token.transferBusiness(accounts[3], web3.utils.toBN(1e17), {
      from: accounts[2],
    });

    const tokenBalanceNew = await token.balanceOf(accounts[0]);

    return assert.isTrue(
      BigNumber(tokenBalanceNew.toString())
        .minus(BigNumber(tokenBalance.toString()))
        .isEqualTo(BigNumber(1e17).times(BigNumber(0.01)))
    );
  });

  it('should let owner add a discounted address', async function () {
    const token = await usdm.deployed();

    await token.addDiscount(3, accounts[5], { from: accounts[0] });

    const discount = await token.discount(accounts[5]);

    return assert.isTrue(discount.valid === true);
  });

  it('should let owner remove a discounted address', async function () {
    const token = await usdm.deployed();

    await token.removeDiscount(accounts[5], { from: accounts[0] });

    const discount = await token.discount(accounts[5]);

    return assert.isTrue(discount.valid !== true);
  });

  it('should let only owner add a discounted address', async function () {
    const token = await usdm.deployed();

    let discountError;

    try {
      await token.addDiscount(3, accounts[5], { from: accounts[4] });
    } catch (error) {
      discountError = error;
    }

    return assert.isTrue(discountError && discountError !== undefined);
  });

  it('should send a correct discounted fee to fee recipient for a business transaction to a discounted address', async function () {
    const token = await usdm.deployed();

    await token.addDiscount(5, accounts[4], { from: accounts[0] });

    const tokenBalance = await token.balanceOf(accounts[0]);

    await token.transferBusiness(accounts[4], web3.utils.toBN(1e17), {
      from: accounts[2],
    });

    const tokenBalanceNew = await token.balanceOf(accounts[0]);

    return assert.isTrue(
      BigNumber(tokenBalanceNew.toString())
        .minus(BigNumber(tokenBalance.toString()))
        .isEqualTo(BigNumber(1e17).times(BigNumber(0.005)))
    );
  });
});

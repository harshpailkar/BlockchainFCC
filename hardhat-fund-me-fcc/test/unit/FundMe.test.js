const { assert, expect } = require("chai")
const {deployments, ethers, getNamedAccounts} = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) ? describe.skip :
describe("FundMe", async function() {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
    })

    describe("constructor", async () => {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", async () => {
        it("Fails if you dont send enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!")
        })
        it("Updates the amount funded data structure", async () => {
            await fundMe.fund({value: sendValue})
            const response = await fundMe.getAddressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("adds funder to array of funders", async () => {
            await fundMe.fund({value: sendValue})
            const funder = await fundMe.getFunder(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({value: sendValue})
        })

        it("Withdraw ETH from a single funder", async () => {
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const {gasUsed, effectiveGasPrice} = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())
        })

        it("cheaperWithdraw ETH from a single funder", async () => {
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const {gasUsed, effectiveGasPrice} = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())
        })

        it("Allows us to withdraw with multiple users", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance =
                await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.withdraw()
            // Let's comapre gas costs :)
            // const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance =
                await fundMe.provider.getBalance(deployer)
            // Assert
            assert.equal(
                startingFundMeBalance
                    .add(startingDeployerBalance)
                    .toString(),
                endingDeployerBalance.add(withdrawGasCost).toString()
            )
            // Make a getter for storage variables
            await expect(fundMe.getFunder(0)).to.be.reverted

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(
                        accounts[i].address
                    ),
                    0
                )
            }
  
        })

        it("Only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(attackerConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner")
        })

        it("cheaperWithdraw testing...", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance =
                await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.cheaperWithdraw()
            // Let's comapre gas costs :)
            // const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance =
                await fundMe.provider.getBalance(deployer)
            // Assert
            assert.equal(
                startingFundMeBalance
                    .add(startingDeployerBalance)
                    .toString(),
                endingDeployerBalance.add(withdrawGasCost).toString()
            )
            // Make a getter for storage variables
            await expect(fundMe.getFunder(0)).to.be.reverted

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(
                        accounts[i].address
                    ),
                    0
                )
            }
  
        })
    })
})
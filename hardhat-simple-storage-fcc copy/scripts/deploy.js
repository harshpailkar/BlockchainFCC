//imports
const { ethers, run, network } = require("hardhat")

//async main
async function main() {
  const SimpleStorageFactory = await ethers.getContractFactory(
    "SimpleStorage"
  )
  console.log("Deploying contract...")
  const simpleStroage = await SimpleStorageFactory.deploy()
  await simpleStroage.deployed()
  console.log('Deployed contract to: ' + simpleStroage.address)
  if(network.config.chainId === 5 && process.env.ETHERSCAN_API_KEY){
    await simpleStroage.deployTransaction.wait(6)
    await verify(simpleStroage.address, [])
  }

  const currentValue = await simpleStroage.retrieve()
  console.log("Current value is: " + currentValue)

  const transactionResponse = await simpleStroage.store(7)
  await transactionResponse.wait(1)
  const updatedValue = await simpleStroage.retrieve()
  console.log("Updated value is: " + updatedValue)
}

async function verify(contractAddress, args){
  console.log("Verifying conttact...")
  try{
    await run("verify: verify", {
      address: contractAddress,
      constructorArguements: args,
    })
  } catch (e){
    if(e.message.toLowerCase().includes("already verified")){
      console.log("Already Verified!")
    } else {
      console.log(e)
    }
  }
}

//main
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
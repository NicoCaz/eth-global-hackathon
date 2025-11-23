import { expect } from "chai";
import { ethers } from "hardhat";

describe("RaffleFactory end-to-end", function () {
  it("deploys factory, creates raffle, buys tickets and executes draw", async function () {
    const [factoryOwner, raffleCreator, buyer1, buyer2, projectReceiver] =
      await ethers.getSigners();

    const MockEntropy = await ethers.getContractFactory("MockEntropy");
    const entropy = await MockEntropy.deploy(
      factoryOwner.address,
      ethers.parseEther("0.0001")
    );
    await entropy.deployed();

    const Factory = await ethers.getContractFactory("RaffleFactory");
    const factory = await Factory.deploy(await entropy.getAddress(), factoryOwner.address);
    await factory.deployed();

    const raffleDuration = 60;

    const tx = await factory
      .connect(raffleCreator)
      .createRaffle(
        "Test project",
        "Integration test raffle",
        5000,
        projectReceiver.address,
        raffleDuration
      );
    const receipt = await tx.wait();

    const event = receipt.events?.find((log) => log.event === "RaffleCreated");
    expect(event, "expected RaffleCreated event").to.exist;
    const raffleAddress = event?.args?.raffleAddress;
    expect(raffleAddress).to.be.a("string");

    const raffle = await ethers.getContractAt("ProjectRaffle", raffleAddress);

    await raffle
      .connect(buyer1)
      .buyTickets({ value: ethers.parseEther("0.01") });
    await raffle
      .connect(buyer2)
      .buyTickets({ value: ethers.parseEther("0.02") });

    await ethers.provider.send("evm_increaseTime", [raffleDuration + 1]);
    await ethers.provider.send("evm_mine");

    const providerAddress = await entropy.getDefaultProvider();
    const fee = await entropy.getFee(providerAddress);

    await raffle.connect(raffleCreator).requestEntropy(ethers.constants.HashZero, {
      value: fee,
    });

    const sequence = await raffle.entropySequenceNumber();
    await entropy.respond(sequence, ethers.hexZeroPad("0x1", 32));

    const state = await raffle.state();
    expect(state).to.equal(2);

    const winner = await raffle.winner();
    expect([buyer1.address, buyer2.address]).to.include(winner);
  });
});


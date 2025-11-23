import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Integration Tests - Multiple Raffles & Users", function () {
  let factory: any;
  let mockEntropy: any;
  let factoryOwner: any;
  let creator1: any, creator2: any, creator3: any;
  let buyer1: any, buyer2: any, buyer3: any, buyer4: any, buyer5: any;
  let project1: any, project2: any, project3: any;

  beforeEach(async function () {
    [
      factoryOwner,
      creator1,
      creator2,
      creator3,
      buyer1,
      buyer2,
      buyer3,
      buyer4,
      buyer5,
      project1,
      project2,
      project3,
    ] = await ethers.getSigners();

    // Deploy MockEntropy
    const MockEntropy = await ethers.getContractFactory("MockEntropy");
    mockEntropy = await MockEntropy.deploy(
      factoryOwner.address,
      ethers.parseEther("0.0001")
    );

    // Deploy Factory
    const Factory = await ethers.getContractFactory("RaffleFactory");
    factory = await Factory.deploy(
      await mockEntropy.getAddress(),
      factoryOwner.address
    );
  });

  describe("Scenario 1: Multiple Raffles with Multiple Users", function () {
    it("should handle 3 raffles with 5 different users buying tickets", async function () {
      const raffleDuration = 3600; // 1 hour

      // Create 3 raffles
      const tx1 = await factory
        .connect(creator1)
        .createRaffle(
          "Project Alpha",
          "First project",
          3000, // 30%
          project1.address,
          raffleDuration
        );
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle1Address = event1?.args?.raffleAddress;
      const raffle1 = await ethers.getContractAt(
        "ProjectRaffle",
        raffle1Address
      );

      const tx2 = await factory
        .connect(creator2)
        .createRaffle(
          "Project Beta",
          "Second project",
          5000, // 50%
          project2.address,
          raffleDuration
        );
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle2Address = event2?.args?.raffleAddress;
      const raffle2 = await ethers.getContractAt(
        "ProjectRaffle",
        raffle2Address
      );

      const tx3 = await factory
        .connect(creator3)
        .createRaffle(
          "Project Gamma",
          "Third project",
          7000, // 70%
          project3.address,
          raffleDuration
        );
      const receipt3 = await tx3.wait();
      const event3 = receipt3.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle3Address = event3?.args?.raffleAddress;
      const raffle3 = await ethers.getContractAt(
        "ProjectRaffle",
        raffle3Address
      );

      // Verify all raffles are created
      expect(await factory.getRaffleCount()).to.equal(3);

      // Raffle 1: buyer1, buyer2, buyer3
      await raffle1
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.01") });
      await raffle1
        .connect(buyer2)
        .buyTickets({ value: ethers.parseEther("0.05") });
      await raffle1
        .connect(buyer3)
        .buyTickets({ value: ethers.parseEther("0.1") });

      // Raffle 2: buyer2, buyer4, buyer5
      await raffle2
        .connect(buyer2)
        .buyTickets({ value: ethers.parseEther("0.02") });
      await raffle2
        .connect(buyer4)
        .buyTickets({ value: ethers.parseEther("0.03") });
      await raffle2
        .connect(buyer5)
        .buyTickets({ value: ethers.parseEther("0.04") });

      // Raffle 3: buyer1, buyer3, buyer5
      await raffle3
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.015") });
      await raffle3
        .connect(buyer3)
        .buyTickets({ value: ethers.parseEther("0.025") });
      await raffle3
        .connect(buyer5)
        .buyTickets({ value: ethers.parseEther("0.035") });

      // Verify totals
      expect(await raffle1.totalTickets()).to.equal(
        ethers.parseEther("0.16")
      );
      expect(await raffle1.getParticipantsCount()).to.equal(3);

      expect(await raffle2.totalTickets()).to.equal(
        ethers.parseEther("0.09")
      );
      expect(await raffle2.getParticipantsCount()).to.equal(3);

      expect(await raffle3.totalTickets()).to.equal(
        ethers.parseEther("0.075")
      );
      expect(await raffle3.getParticipantsCount()).to.equal(3);
    });
  });

  describe("Scenario 2: Same User Multiple Purchases", function () {
    it("should allow same user to buy tickets multiple times", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle(
          "Test Project",
          "Test",
          5000,
          project1.address,
          3600
        );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffleAddress = event?.args?.raffleAddress;
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        raffleAddress
      );

      // Same user buys 3 times
      await raffle
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.01") });
      await raffle
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.02") });
      await raffle
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.03") });

      expect(await raffle.totalTickets()).to.equal(ethers.parseEther("0.06"));
      expect(await raffle.getParticipantsCount()).to.equal(3); // 3 separate entries
    });
  });

  describe("Scenario 3: Edge Cases - Minimum Values", function () {
    it("should accept minimum ticket price", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 5000, project1.address, 3600);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      await raffle
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.0001") }); // Minimum

      expect(await raffle.totalTickets()).to.equal(
        ethers.parseEther("0.0001")
      );
    });

    it("should reject below minimum ticket price", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 5000, project1.address, 3600);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      await expect(
        raffle
          .connect(buyer1)
          .buyTickets({ value: ethers.parseEther("0.00001") })
      ).to.be.revertedWith("Minimum ticket price is 0.0001 ETH");
    });

    it("should accept minimum project percentage (1 basis point)", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 1, project1.address, 3600);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      expect(await raffle.projectPercentage()).to.equal(1);
    });
  });

  describe("Scenario 4: Edge Cases - Maximum Values", function () {
    it("should accept maximum project percentage (9950 basis points)", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 9950, project1.address, 3600);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      expect(await raffle.projectPercentage()).to.equal(9950);
    });

    it("should reject percentage that exceeds 100% with platform fee", async function () {
      await expect(
        factory
          .connect(creator1)
          .createRaffle("Test", "Test", 10000, project1.address, 3600)
      ).to.be.revertedWith("Percentages too high");
    });
  });

  describe("Scenario 5: Complete Flow - Multiple Raffles End-to-End", function () {
    it("should complete full flow: create, buy, draw, distribute for 2 raffles", async function () {
      const raffleDuration = 60; // 1 minute for testing

      // Create 2 raffles
      const tx1 = await factory
        .connect(creator1)
        .createRaffle(
          "Project A",
          "First",
          3000,
          project1.address,
          raffleDuration
        );
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle1 = await ethers.getContractAt(
        "ProjectRaffle",
        event1?.args?.raffleAddress
      );

      const tx2 = await factory
        .connect(creator2)
        .createRaffle(
          "Project B",
          "Second",
          7000,
          project2.address,
          raffleDuration
        );
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle2 = await ethers.getContractAt(
        "ProjectRaffle",
        event2?.args?.raffleAddress
      );

      // Buy tickets for raffle 1
      await raffle1
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.01") });
      await raffle1
        .connect(buyer2)
        .buyTickets({ value: ethers.parseEther("0.02") });

      // Buy tickets for raffle 2
      await raffle2
        .connect(buyer3)
        .buyTickets({ value: ethers.parseEther("0.03") });
      await raffle2
        .connect(buyer4)
        .buyTickets({ value: ethers.parseEther("0.04") });

      // Fast forward time
      await time.increase(raffleDuration + 1);
      await time.advanceBlock();

      // Request entropy for raffle 1
      const fee1 = await mockEntropy.getFee(
        await mockEntropy.getDefaultProvider()
      );
      await raffle1
        .connect(creator1)
        .requestEntropy(ethers.ZeroHash, { value: fee1 });
      const sequence1 = await raffle1.entropySequenceNumber();
      await mockEntropy.respond(sequence1, ethers.hexZeroPad("0x1", 32));

      // Request entropy for raffle 2
      const fee2 = await mockEntropy.getFee(
        await mockEntropy.getDefaultProvider()
      );
      await raffle2
        .connect(creator2)
        .requestEntropy(ethers.ZeroHash, { value: fee2 });
      const sequence2 = await raffle2.entropySequenceNumber();
      await mockEntropy.respond(sequence2, ethers.hexZeroPad("0x2", 32));

      // Verify both raffles have winners
      expect(await raffle1.state()).to.equal(2); // DrawExecuted
      expect(await raffle2.state()).to.equal(2); // DrawExecuted

      const winner1 = await raffle1.winner();
      const winner2 = await raffle2.winner();

      expect([buyer1.address, buyer2.address]).to.include(winner1);
      expect([buyer3.address, buyer4.address]).to.include(winner2);

      // Distribute funds
      await raffle1.connect(creator1).distributeFunds();
      await raffle2.connect(creator2).distributeFunds();

      expect(await raffle1.fundsDistributed()).to.be.true;
      expect(await raffle2.fundsDistributed()).to.be.true;
    });
  });

  describe("Scenario 6: Large Number of Participants", function () {
    it("should handle 10 different users buying tickets", async function () {
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 5000, project1.address, 3600);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      const buyers = [buyer1, buyer2, buyer3, buyer4, buyer5];
      const amounts = [
        "0.01",
        "0.02",
        "0.03",
        "0.04",
        "0.05",
        "0.06",
        "0.07",
        "0.08",
        "0.09",
        "0.1",
      ];

      // Create 10 signers (we have 5, so we'll use them twice)
      for (let i = 0; i < 10; i++) {
        const buyer = buyers[i % 5];
        await raffle
          .connect(buyer)
          .buyTickets({ value: ethers.parseEther(amounts[i]) });
      }

      expect(await raffle.getParticipantsCount()).to.equal(10);
      expect(await raffle.totalTickets()).to.equal(ethers.parseEther("0.55"));
    });
  });

  describe("Scenario 7: Time-Based Edge Cases", function () {
    it("should reject ticket purchase after raffle ends", async function () {
      const raffleDuration = 60;
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 5000, project1.address, raffleDuration);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      // Fast forward past duration
      await time.increase(raffleDuration + 1);
      await time.advanceBlock();

      await expect(
        raffle.connect(buyer1).buyTickets({ value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Raffle ended");
    });

    it("should allow entropy request only after raffle ends", async function () {
      const raffleDuration = 60;
      const tx = await factory
        .connect(creator1)
        .createRaffle("Test", "Test", 5000, project1.address, raffleDuration);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle = await ethers.getContractAt(
        "ProjectRaffle",
        event?.args?.raffleAddress
      );

      await raffle
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("0.01") });

      const fee = await mockEntropy.getFee(
        await mockEntropy.getDefaultProvider()
      );

      // Try to request before end - should fail
      await expect(
        raffle
          .connect(creator1)
          .requestEntropy(ethers.ZeroHash, { value: fee })
      ).to.be.revertedWith("Raffle still active");

      // Fast forward
      await time.increase(raffleDuration + 1);
      await time.advanceBlock();

      // Now should work
      await raffle
        .connect(creator1)
        .requestEntropy(ethers.ZeroHash, { value: fee });
    });
  });

  describe("Scenario 8: Fund Distribution Edge Cases", function () {
    it("should distribute funds correctly with different percentages", async function () {
      const raffleDuration = 60;

      // Create raffle with 30% for project
      const tx1 = await factory
        .connect(creator1)
        .createRaffle("Test1", "Test", 3000, project1.address, raffleDuration);
      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle1 = await ethers.getContractAt(
        "ProjectRaffle",
        event1?.args?.raffleAddress
      );

      // Create raffle with 70% for project
      const tx2 = await factory
        .connect(creator2)
        .createRaffle("Test2", "Test", 7000, project2.address, raffleDuration);
      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(
        (log: any) => log.fragment?.name === "RaffleCreated"
      );
      const raffle2 = await ethers.getContractAt(
        "ProjectRaffle",
        event2?.args?.raffleAddress
      );

      // Both raffles receive 1 ETH total
      await raffle1
        .connect(buyer1)
        .buyTickets({ value: ethers.parseEther("1.0") });
      await raffle2
        .connect(buyer2)
        .buyTickets({ value: ethers.parseEther("1.0") });

      // Fast forward and execute draws
      await time.increase(raffleDuration + 1);
      await time.advanceBlock();

      const fee = await mockEntropy.getFee(
        await mockEntropy.getDefaultProvider()
      );

      await raffle1
        .connect(creator1)
        .requestEntropy(ethers.ZeroHash, { value: fee });
      const seq1 = await raffle1.entropySequenceNumber();
      await mockEntropy.respond(seq1, ethers.hexZeroPad("0x1", 32));

      await raffle2
        .connect(creator2)
        .requestEntropy(ethers.ZeroHash, { value: fee });
      const seq2 = await raffle2.entropySequenceNumber();
      await mockEntropy.respond(seq2, ethers.hexZeroPad("0x2", 32));

      // Distribute
      await raffle1.connect(creator1).distributeFunds();
      await raffle2.connect(creator2).distributeFunds();

      // Both should have distributed
      expect(await raffle1.fundsDistributed()).to.be.true;
      expect(await raffle2.fundsDistributed()).to.be.true;
    });
  });

  describe("Scenario 9: Factory Edge Cases", function () {
    it("should handle creating many raffles", async function () {
      for (let i = 0; i < 10; i++) {
        await factory
          .connect(creator1)
          .createRaffle(
            `Project ${i}`,
            `Description ${i}`,
            5000,
            project1.address,
            3600
          );
      }

      expect(await factory.getRaffleCount()).to.equal(10);
    });

    it("should return correct latest raffles", async function () {
      const addresses = [];
      for (let i = 0; i < 5; i++) {
        const tx = await factory
          .connect(creator1)
          .createRaffle(
            `Project ${i}`,
            `Desc ${i}`,
            5000,
            project1.address,
            3600
          );
        const receipt = await tx.wait();
        const event = receipt.logs.find(
          (log: any) => log.fragment?.name === "RaffleCreated"
        );
        addresses.push(event?.args?.raffleAddress);
      }

      const latest = await factory.getLatestRaffles(3);
      expect(latest.length).to.equal(3);
      expect(latest[0]).to.equal(addresses[4]); // Latest
      expect(latest[1]).to.equal(addresses[3]);
      expect(latest[2]).to.equal(addresses[2]);
    });
  });
});


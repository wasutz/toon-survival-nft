const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised');
const {ethers} = require('hardhat');
const web3 = require('web3');
const {expect} = chai;

chai.use(ChaiAsPromised);

describe("ToonSurvival", () => {
    let toonSurvival = null;
    let addr1, addr2, addr3;
    const baseUri = "ipfs://baseUri/";
    const hiddenBaseUri = "ipfs://hiddenBaseUri/";
    const stages = {
        Paused: 0,
        Presale: 1,
        PublicSale: 2
    }

    beforeEach(async () => {
        [addr1, addr2, addr3] = await ethers.getSigners();

        const ToonSurvivalContract = await ethers.getContractFactory("ToonSurvival");
        toonSurvival = await ToonSurvivalContract.deploy(baseUri, hiddenBaseUri);

        await toonSurvival.deployed();
    });

    it('should has 0 totalSupply with no minted token', async () => {
        const supply = await toonSurvival.totalSupply();

        expect(supply.toNumber()).to.equal(0);
    });

    it('should on Stage.Paused by default', async () => {
        const stage = await toonSurvival.stage();

        expect(stage).to.equal(stages.Paused);
    });

    it('should mint failed when mint amount is 0', async () => {
        await expect(toonSurvival.mint(0)).to.be.revertedWith('Invalid mint amount!');
    });

    it('should mint failed when mintAmount is greater than maxMintAmountPerTx', async () => {
        await expect(toonSurvival.mint(6, {
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith('Invalid mint amount!');
    });

    it('should return empty walletOfOwner with no minted token', async () => {
        const ids = await toonSurvival.walletOfOwner(addr1.getAddress());

        expect(ids.length).to.equal(0);
    });

    it('should mint failed when over max supply', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.setMaxMintAmount(100);
        await toonSurvival.setMaxMintAmountPerTx(100);
        await toonSurvival.mint(100, {
            value: web3.utils.toWei('10', 'ether')
        });

        await expect(toonSurvival.mint(1, {
            value:  web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith('Max supply exceeded!');
    });

    it('should mint failed when address mint amount is greater than maxMintAmount', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.mint(2, {value: web3.utils.toWei('0.2', 'ether')});
        await toonSurvival.mint(2, {value: web3.utils.toWei('0.2', 'ether')});
        await toonSurvival.mint(1, {value: web3.utils.toWei('0.1', 'ether')});

        await expect(toonSurvival.mint(1, {
            from: await addr1.getAddress(),
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith('Mint over max mint amount!');
    });

    it('should mint failed when insufficient fund', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await expect(toonSurvival.connect(addr3).mint(1))
            .to.be.rejectedWith(Error, 'insufficient funds for intrinsic transaction cost');
    });

    it('should mint failed when contract is Paused', async () => {
        await expect(toonSurvival.mint(1, {
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith("The contract is paused!");
    });

    it('should be able mintForAddress even the contract is Paused', async () => {
        await toonSurvival.mintForAddress(1, addr2.getAddress());

        const supply = await toonSurvival.totalSupply();
        const walletOfOwner = await toonSurvival.walletOfOwner(addr2.getAddress());

        expect(supply.toNumber()).to.equal(1);
        expect(walletOfOwner.length).to.equal(1);
    });

    it('should mint failed when on Presale stage and the user doese not in whitelisted', async () => {
        await toonSurvival.setStage(stages.Presale);
        await expect(toonSurvival.connect(addr2).mint(1, {
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith("User is not whitelisted!");
    });

    it('should have token when mint on Presale and the user is in whitelisted', async () => {
        await toonSurvival.addToWhitelist([addr2.getAddress()]);
        await toonSurvival.setStage(stages.Presale);
        await toonSurvival.connect(addr2).mint(1, {
            value: web3.utils.toWei('0.1', 'ether')
        });

        const supply = await toonSurvival.totalSupply();
        const isWhitelist = await toonSurvival.isWhitelist(addr2.getAddress());
        const walletOfOwner = await toonSurvival.walletOfOwner(addr2.getAddress());

        expect(isWhitelist).to.equal(true);
        expect(supply.toNumber()).to.equal(1);
        expect(walletOfOwner.length).to.equal(1);
    });

    it('should have token when mint on public sale success', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.connect(addr3).mint(2, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const supply = await toonSurvival.totalSupply();
        const isWhitelist = await toonSurvival.isWhitelist(addr3.getAddress());
        const walletOfOwner = await toonSurvival.walletOfOwner(addr3.getAddress());

        expect(isWhitelist).to.equal(false);
        expect(supply.toNumber()).to.equal(2);
        expect(walletOfOwner.length).to.equal(2);
    });

    it('should get hiddenBaseURI with token id when get tokenURI and revealed is false', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.connect(addr1).mint(1, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const tokenUri = await toonSurvival.tokenURI(1);

        expect(tokenUri).to.equal(hiddenBaseUri + "1");
    });

    it('should get baseUri with token id when get tokenURI and revealed is true', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.setRevealed(true);
        await toonSurvival.connect(addr1).mint(1, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const tokenUri = await toonSurvival.tokenURI(1);

        expect(tokenUri).to.equal(baseUri + "1");
    });
});

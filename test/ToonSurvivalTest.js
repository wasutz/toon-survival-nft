const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised');
const {ethers} = require('hardhat');
const web3 = require('web3');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {expect} = chai;

chai.use(ChaiAsPromised);

describe("ToonSurvival", () => {
    let toonSurvival = null;
    let owner, whitelistUser, user, user2;
    let whitelistTestAddresses = [];
    const baseUri = "ipfs://baseUri/";
    const hiddenBaseUri = "ipfs://hiddenBaseUri/";
    const stages = {
        Paused: 0,
        Presale: 1,
        PublicSale: 2
    }

    beforeEach(async () => {
        [owner, whitelistUser, user, user2] = await ethers.getSigners();

        const ToonSurvivalContract = await ethers.getContractFactory("ToonSurvival");
        toonSurvival = await ToonSurvivalContract.deploy(baseUri, hiddenBaseUri);
        whitelistTestAddresses = [await whitelistUser.getAddress()];

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

    it('should mint failed when over max supply', async () => {
        const totalSupply = await toonSurvival.maxSupply();

        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.setMaxMintAmount(totalSupply);
        await toonSurvival.setMaxMintAmountPerTx(totalSupply);
        await toonSurvival.connect(user).mint(totalSupply, {
            value: web3.utils.toWei('10', 'ether')
        });

        await expect(toonSurvival.connect(user2).mint(1, {
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith('Max supply exceeded!');
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
        const ownerTokenIds = await toonSurvival.walletOfOwner(owner.getAddress());
        const whitelistUserTokenIds = await toonSurvival.walletOfOwner(whitelistUser.getAddress());
        const userTokenIds = await toonSurvival.walletOfOwner(user.getAddress());

        expect(ownerTokenIds.length).to.equal(0);
        expect(whitelistUserTokenIds.length).to.equal(0);
        expect(userTokenIds.length).to.equal(0);
    });

    it('should mint failed when address mint amount is greater than maxMintAmount', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.mint(2, {value: web3.utils.toWei('0.2', 'ether')});
        await toonSurvival.mint(2, {value: web3.utils.toWei('0.2', 'ether')});
        await toonSurvival.mint(1, {value: web3.utils.toWei('0.1', 'ether')});

        await expect(toonSurvival.mint(1, {
            from: await owner.getAddress(),
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith('Mint over max mint amount!');
    });

    it('should mint failed when insufficient fund', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await expect(toonSurvival.connect(user).mint(1))
            .to.be.rejectedWith(Error, 'insufficient funds for intrinsic transaction cost');
    });

    it('should mint failed when contract is Paused', async () => {
        await expect(toonSurvival.mint(1, {
            value: web3.utils.toWei('0.1', 'ether')
        })).to.be.revertedWith("The contract does not in PublicSale stage");
    });

    it('should be able mintForAddress even the contract is Paused', async () => {
        await toonSurvival.mintForAddress(1, user.getAddress());

        const supply = await toonSurvival.totalSupply();
        const walletOfOwner = await toonSurvival.walletOfOwner(user.getAddress());

        expect(supply.toNumber()).to.equal(1);
        expect(walletOfOwner.length).to.equal(1);
    });

    it('should mint failed when on Presale stage and the user does not in whitelisted', async () => {
        const leafNodes = whitelistTestAddresses.map(addr => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        const rootHash = merkleTree.getRoot();

        await toonSurvival.setMerkleRoot('0x' + rootHash.toString('hex'));
        await toonSurvival.setStage(stages.Presale);
        await expect(toonSurvival.connect(user).whitelistMint(1,
            merkleTree.getHexProof(keccak256(await user.getAddress())),
            {value: web3.utils.toWei('0.1', 'ether')}
        )).to.be.revertedWith("Invalid proof!");
    });

    it('should have token when mint on Presale and the user is in whitelisted', async () => {
        const leafNodes = whitelistTestAddresses.map(addr => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        const rootHash = merkleTree.getRoot();

        await toonSurvival.setMerkleRoot('0x' + rootHash.toString('hex'));
        await toonSurvival.setStage(stages.Presale);
        await toonSurvival.connect(whitelistUser).whitelistMint(1,
            merkleTree.getHexProof(keccak256(await whitelistUser.getAddress())),
            {value: web3.utils.toWei('0.1', 'ether')}
        );
        await expect(toonSurvival.connect(whitelistUser).whitelistMint(1,
            merkleTree.getHexProof(keccak256(await whitelistUser.getAddress())),
            {value: web3.utils.toWei('0.1', 'ether')}
        )).to.be.revertedWith("Address already claimed!");

        const supply = await toonSurvival.totalSupply();
        const walletOfOwner = await toonSurvival.walletOfOwner(whitelistUser.getAddress());

        expect(supply.toNumber()).to.equal(1);
        expect(walletOfOwner.length).to.equal(1);
    });

    it('should have token when mint on public sale success', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.connect(user).mint(2, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const supply = await toonSurvival.totalSupply();
        const walletOfOwner = await toonSurvival.walletOfOwner(user.getAddress());

        expect(supply.toNumber()).to.equal(2);
        expect(walletOfOwner.length).to.equal(2);
    });

    it('should get hiddenBaseURI with token id when get tokenURI and revealed is false', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.connect(user).mint(1, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const tokenUri = await toonSurvival.tokenURI(1);

        expect(tokenUri).to.equal(hiddenBaseUri + "1");
    });

    it('should get baseUri with token id when get tokenURI and revealed is true', async () => {
        await toonSurvival.setStage(stages.PublicSale);
        await toonSurvival.setRevealed(true);
        await toonSurvival.connect(user).mint(1, {
            value: web3.utils.toWei('0.2', 'ether')
        });

        const tokenUri = await toonSurvival.tokenURI(1);

        expect(tokenUri).to.equal(baseUri + "1");
    });
});

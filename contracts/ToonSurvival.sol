// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ToonSurvival is ERC721A, Ownable, ReentrancyGuard {
  using Strings for uint256;

  enum Stages {
    Paused,
    Presale,
    PublicSale,
    DutchAuction
  }

  string baseURI;
  string public hiddenBaseURI;
  uint256 public cost;
  uint256 public maxSupply;
  uint256 public maxMintAmount;
  uint256 public maxMintAmountPerTx;
  bool public revealed = false;
  Stages public stage = Stages.Paused;

  // Whitelist
  bytes32 public merkleRoot;
  uint256 public maxWhitelistMintAmount = 1;
  mapping(address => uint256) public whitelistClaimed;

  // Dutch auction
  uint256 public dutchAuctionStartTime;
  uint256 public constant auctionStartPrice = 0.5 ether;
  uint256 public constant auctionEndPrice = 0.1 ether;
  uint256 public constant auctionTimeLength = 180 minutes;
  uint256 public constant auctionDropInterval = 45 minutes;
  uint256 public constant auctionDropPerStep = (auctionStartPrice - auctionEndPrice) / (auctionTimeLength / auctionDropInterval);

  constructor(
    string memory _tokenName,
    string memory _tokenSymbol,
    uint256 _cost,
    uint256 _maxSupply,
    uint256 _maxMintAmount,
    uint256 _maxMintAmountPerTx,
    string memory _initBaseURI,
    string memory _initHiddenBaseURI
  ) ERC721A(_tokenName, _tokenSymbol) {
    cost = _cost;
    maxSupply = _maxSupply;
    maxMintAmount = _maxMintAmount;
    maxMintAmountPerTx = _maxMintAmountPerTx;
    baseURI = _initBaseURI;
    hiddenBaseURI = _initHiddenBaseURI;
  }

  modifier mintCompliance(uint256 _mintAmount) {
    require(_mintAmount > 0 && _mintAmount <= maxMintAmountPerTx, "Invalid mint amount!");
    require(balanceOf(msg.sender) + _mintAmount <= maxMintAmount, "Mint over max mint amount!");
    require(totalSupply() + _mintAmount <= maxSupply, "Max supply exceeded!");
    _;
  }

  function whitelistMint(uint256 _mintAmount, bytes32[] calldata _merkleProof) public payable mintCompliance(_mintAmount) {
    require(stage == Stages.Presale, "The contract does not in Presale stage");
    require(whitelistClaimed[msg.sender] + _mintAmount <= maxWhitelistMintAmount, 'Mint over max whitelist mint amount');
    require(msg.value >= cost * _mintAmount, 'Insufficient funds!');

    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid proof!');
    whitelistClaimed[msg.sender] = whitelistClaimed[msg.sender] + _mintAmount;

    _safeMint(msg.sender, _mintAmount);
  }

  function mint(uint256 _mintAmount) public payable mintCompliance(_mintAmount) {
    require(stage == Stages.PublicSale, "The contract does not in PublicSale stage");
    require(msg.value >= cost * _mintAmount, 'Insufficient funds!');

    _safeMint(msg.sender, _mintAmount);
  }

  function mintForAddress(uint256 _mintAmount, address _receiver) public mintCompliance(_mintAmount) onlyOwner {
    _safeMint(_receiver, _mintAmount);
  }

  function dutchAuctionMint(uint256 _mintAmount) external payable mintCompliance(_mintAmount) {
    require(stage == Stages.DutchAuction, "The contract does not in DutchAuction stage");
    require(block.timestamp >= dutchAuctionStartTime, "Auction does not start");
    require(msg.value >= dutchAuctionPrice() * _mintAmount, 'Insufficient funds!');

    _safeMint(msg.sender, _mintAmount);
  }

  function dutchAuctionPrice() public view returns (uint256) {
      uint256 timestamp = block.timestamp;

      if (timestamp < dutchAuctionStartTime) {
        return auctionStartPrice;
      }

      if (timestamp - dutchAuctionStartTime >= auctionTimeLength) {
        return auctionEndPrice;
      }

      uint256 steps = (timestamp - dutchAuctionStartTime) / auctionDropInterval;
      return auctionStartPrice - (steps * auctionDropPerStep);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(
      _exists(tokenId),
      "ERC721Metadata: URI query for nonexistent token"
    );

    string memory currentBaseURI = revealed ? _baseURI() : hiddenBaseURI;

    return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, tokenId.toString()))
        : "";
  }

  function walletOfOwner(address _owner) public view returns (uint256[] memory) {
    uint256 ownerTokenCount = balanceOf(_owner);
    uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
    uint256 currentTokenId = _startTokenId();
    uint256 ownedTokenIndex = 0;

    while (ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply) {
      TokenOwnership memory ownership = _ownerships[currentTokenId];

      if (!ownership.burned && ownership.addr == _owner) {
        ownedTokenIds[ownedTokenIndex] = currentTokenId;

        ownedTokenIndex++;
      }

      currentTokenId++;
    }

    return ownedTokenIds;
  }

  function setBaseURI(string memory _newBaseURI) public onlyOwner {
    baseURI = _newBaseURI;
  }

  function setHiddenBaseURI(string memory _newHiddenBaseURI) public onlyOwner {
    hiddenBaseURI = _newHiddenBaseURI;
  }

  function setCost(uint256 _cost) public onlyOwner {
    cost = _cost;
  }

  function setMaxMintAmount(uint256 _maxMintAmount) public onlyOwner {
    maxMintAmount = _maxMintAmount;
  }

  function setMaxMintAmountPerTx(uint256 _maxMintAmountPerTx) public onlyOwner {
    maxMintAmountPerTx = _maxMintAmountPerTx;
  }

  function setStage(Stages _stage) public onlyOwner {
    stage = _stage;
  }

  function setRevealed(bool _revealed) public onlyOwner {
    revealed = _revealed;
  }

  function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
    merkleRoot = _merkleRoot;
  }

  function setMaxWhitelistMintAmount(uint256 _maxWhitelistMintAmount) public onlyOwner {
    maxWhitelistMintAmount = _maxWhitelistMintAmount;
  }

  function setDutchAuctionStartTime(uint256 startTime) public onlyOwner {
      dutchAuctionStartTime = startTime;
  }

  function withdraw() public payable onlyOwner nonReentrant {
    (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
    require(success);
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }

  function _startTokenId() internal view virtual override returns (uint256) {
    return 1;
  }
}
// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

contract ToonSurvival is ERC721A, Ownable {
  using Strings for uint256;

  enum Stages {
    Paused,
    Presale,
    PublicSale
  }

  string baseURI;
  string public hiddenBaseURI;
  uint256 public cost = 0.1 ether;
  uint256 public maxSupply = 100;
  uint256 public maxMintAmount = 5;
  uint256 public maxMintAmountPerTx = 2;
  bool public revealed = false;
  Stages public stage = Stages.Paused;

  bytes32 public merkleRoot;
  mapping(address => bool) public whitelistClaimed;

  constructor(
    string memory _initBaseURI,
    string memory _initHiddenBaseURI
  ) ERC721A("Toon Survival", "TSVR") {
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
    require(!whitelistClaimed[msg.sender], 'Address already claimed!');
    require(msg.value >= cost * _mintAmount, 'Insufficient funds!');

    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid proof!');
    whitelistClaimed[msg.sender] = true;

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

  function withdraw() public payable onlyOwner {
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
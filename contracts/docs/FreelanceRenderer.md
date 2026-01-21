# Solidity API

## FreelanceRenderer

### RenderParams

```solidity
struct RenderParams {
  uint256 jobId;
  uint16 categoryId;
  uint256 amount;
  uint8 rating;
  string ipfsHash;
}
```

### generateSVG

```solidity
function generateSVG(struct FreelanceRenderer.RenderParams params) internal pure returns (string)
```

### constructTokenURI

```solidity
function constructTokenURI(struct FreelanceRenderer.RenderParams params) internal pure returns (string)
```

### getRatingColors

```solidity
function getRatingColors(uint8 rating) internal pure returns (string color1, string color2, string badge)
```

### getStars

```solidity
function getStars(uint8 rating) internal pure returns (string)
```

### getCategoryName

```solidity
function getCategoryName(uint256 categoryId) internal pure returns (string)
```


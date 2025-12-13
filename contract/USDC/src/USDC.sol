// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") {
        _mint(msg.sender, initialSupply);
    }

    function mint(uint256 amount, address receiver) public{
        _mint(receiver, amount);
    }
}
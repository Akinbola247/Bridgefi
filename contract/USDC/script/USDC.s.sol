// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {USDC} from "../src/USDC.sol";

contract TokenScript is Script {
    USDC public usdc;

    function setUp() public {

    }

    function run() public {
        vm.startBroadcast();

        usdc = new USDC(1000e18);

        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/Cover.sol";

contract DeployScript is Script {
  function run() external returns (Cover cover) {
    vm.startBroadcast();
    cover = new Cover();
    vm.stopBroadcast();
  }
}

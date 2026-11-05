// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Cover.sol";

contract CoverHandler is Test {
  Cover public immutable cover;
  address[] public actors;
  uint256 public activePoolId;

  constructor(Cover _cover) {
    cover = _cover;
    actors.push(address(0x1111));
    actors.push(address(0x2222));
    actors.push(address(0x3333));
    actors.push(address(0x4444));

    for (uint256 i = 0; i < actors.length; i++) {
      vm.deal(actors[i], 1000 ether);
    }

    // Create 1 initial pool
    vm.prank(actors[0]);
    activePoolId = cover.create{value: 1 ether}(
      "Invariant Pool",
      1 ether,
      1 hours,
      1 hours,
      2500,
      30 days
    );

    // Join others
    for (uint256 i = 1; i < actors.length; i++) {
      vm.prank(actors[i]);
      cover.join{value: 1 ether}(activePoolId);
    }
  }

  function act(uint256 actionSeed, uint256 actorSeed, uint128 amount) external {
    address actor = actors[actorSeed % actors.length];
    uint256 action = actionSeed % 4;

    Cover.Pool memory p = cover.poolOf(activePoolId);

    if (action == 0 && !p.closed) {
      // Try filing claim
      if (p.claimCount == 0 || !cover.claimOf(activePoolId, p.claimCount).open) {
        if (block.timestamp + p.voteSecs <= p.endsAt && p.pool > 0) {
          uint128 maxAllowed = uint128((uint256(p.pool) * p.maxClaimBps) / 10000);
          if (maxAllowed > 0) {
            uint128 claimAmt = uint128(bound(amount, 1, maxAllowed));
            vm.prank(actor);
            try cover.file(activePoolId, claimAmt, "Invariant test reason") {} catch {}
          }
        }
      }
    } else if (action == 1 && !p.closed) {
      // Try voting on open claim
      if (p.claimCount > 0) {
        uint32 cNo = p.claimCount;
        Cover.Claim memory c = cover.claimOf(activePoolId, cNo);
        if (c.open && block.timestamp < c.closesAt && actor != c.claimant) {
          vm.prank(actor);
          try cover.vote(activePoolId, actionSeed % 2 == 0) {} catch {}
        }
      }
    } else if (action == 2) {
      // Try settle
      if (p.claimCount > 0) {
        try cover.settle(activePoolId) {} catch {}
      }
    } else if (action == 3) {
      // Try withdraw pending
      vm.prank(actor);
      try cover.withdraw() {} catch {}
    }
  }
}

contract CoverInvariantTest is Test {
  Cover public cover;
  CoverHandler public handler;

  function setUp() public {
    cover = new Cover();
    handler = new CoverHandler(cover);

    targetContract(address(handler));
  }

  function invariant_BalanceEqualsPoolsPlusPending() public view {
    uint256 totalPools = 0;
    uint256 count = cover.poolCount();
    for (uint256 i = 1; i <= count; i++) {
      Cover.Pool memory p = cover.poolOf(i);
      totalPools += p.pool;
    }

    uint256 totalPending = 0;
    for (uint256 i = 0; i < 4; i++) {
      address a = handler.actors(i);
      totalPending += cover.pending(a);
    }

    assertGe(address(cover).balance, totalPools + totalPending);
  }
}

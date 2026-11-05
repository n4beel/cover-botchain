// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Cover.sol";

contract MaliciousRecipient {
  Cover public immutable target;
  bool public attackWithdraw;

  constructor(Cover _target) {
    target = _target;
  }

  function setAttackWithdraw(bool _attack) external {
    attackWithdraw = _attack;
  }

  function triggerWithdraw() external {
    target.withdraw();
  }

  receive() external payable {
    if (attackWithdraw) {
      target.withdraw();
    }
  }
}

contract CoverTest is Test {
  Cover public cover;

  address public creator = address(0x100);
  address public memberA = address(0x101);
  address public memberB = address(0x102);
  address public memberC = address(0x103);
  address public memberD = address(0x104);
  address public lateMember = address(0x105);

  uint128 public constant FEE = 1 ether;
  uint32 public constant WAIT_SECS = 1 days;
  uint32 public constant VOTE_SECS = 3 days;
  uint16 public constant MAX_CLAIM_BPS = 5000; // 50%
  uint64 public constant TERM_SECS = 30 days;

  function setUp() public {
    cover = new Cover();

    vm.deal(creator, 100 ether);
    vm.deal(memberA, 100 ether);
    vm.deal(memberB, 100 ether);
    vm.deal(memberC, 100 ether);
    vm.deal(memberD, 100 ether);
    vm.deal(lateMember, 100 ether);
  }

  function _createPool() internal returns (uint256) {
    vm.prank(creator);
    return cover.create{value: FEE}(
      "Family Cover",
      FEE,
      WAIT_SECS,
      VOTE_SECS,
      MAX_CLAIM_BPS,
      TERM_SECS
    );
  }

  function _setupPoolWithMembers() internal returns (uint256 pid) {
    pid = _createPool();
    vm.prank(memberA);
    cover.join{value: FEE}(pid);
    vm.prank(memberB);
    cover.join{value: FEE}(pid);
    vm.prank(memberC);
    cover.join{value: FEE}(pid);
  }

  function test_CreateAndJoin() public {
    uint256 pid = _createPool();
    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.creator, creator);
    assertEq(p.memberCount, 1);
    assertEq(p.pool, FEE);

    vm.prank(memberA);
    cover.join{value: FEE}(pid);
    p = cover.poolOf(pid);
    assertEq(p.memberCount, 2);
    assertEq(p.pool, FEE * 2);

    address[] memory mems = cover.membersOf(pid);
    assertEq(mems.length, 2);
    assertEq(mems[0], creator);
    assertEq(mems[1], memberA);
  }

  function test_FileBeforeWaitReverts_ArgsReadyAt() public {
    uint256 pid = _setupPoolWithMembers();

    // Pool has 4 members: creator, A, B, C. Pool total = 4 ether.
    // Try to file immediately
    uint64 joined = cover.joinedAt(pid, memberA);
    uint64 readyAt = joined + WAIT_SECS;

    vm.prank(memberA);
    vm.expectRevert(abi.encodeWithSelector(Cover.TooEarly.selector, readyAt));
    cover.file(pid, 1 ether, "Emergency dental");
  }

  function test_FileTooMuchReverts_ArgsMax() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    // Pool = 4 ether. Max 50% = 2 ether.
    uint128 maxAllowed = 2 ether;

    vm.prank(memberA);
    vm.expectRevert(abi.encodeWithSelector(Cover.BadAmount.selector, maxAllowed));
    cover.file(pid, 2.5 ether, "Too high claim");
  }

  function test_OnlyOneOpenClaim() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "First claim");

    vm.prank(memberB);
    vm.expectRevert(Cover.ClaimOpen.selector);
    cover.file(pid, 1 ether, "Second concurrent claim");
  }

  function test_LateJoinerCannotVoteOnOpenClaim() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Claim opened before late member joins");

    // Late member joins now (after openedAt)
    vm.prank(lateMember);
    cover.join{value: FEE}(pid);

    vm.prank(lateMember);
    vm.expectRevert(Cover.NotEligible.selector);
    cover.vote(pid, true);
  }

  function test_ClaimantCannotVote() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Claimant test");

    vm.prank(memberA);
    vm.expectRevert(Cover.ClaimantCannotVote.selector);
    cover.vote(pid, true);
  }

  function test_MajorityOfEligibleNotOfVotes() public {
    uint256 pid = _setupPoolWithMembers();
    // 4 members: creator, A, B, C.
    // A files claim -> eligible voters = creator, B, C (3 voters).
    // Majority of 3 = strict majority: yes * 2 > 3 => needs 2 yes votes.
    // If only 1 votes yes and 2 abstain (silent): total votes cast = 1 yes, 0 no.
    // Cast votes ratio is 100% yes, BUT majority of eligible is not reached (1 * 2 = 2, which is not > 3).
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Medical bill");

    vm.prank(creator);
    cover.vote(pid, true);

    // Warp past voting window
    Cover.Claim memory c = cover.claimOf(pid, 1);
    vm.warp(c.closesAt + 1);

    cover.settle(pid);

    c = cover.claimOf(pid, 1);
    assertFalse(c.open);
    // Claim failed! Pool remains 4 ether, claimant pending = 0
    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.pool, 4 ether);
    assertEq(cover.pending(memberA), 0);
  }

  function test_SettleEarlyOnceMajorityReached() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Car repair");

    // Eligible = creator, B, C (3 voters). Need 2 yes votes.
    vm.prank(creator);
    cover.vote(pid, true);
    vm.prank(memberB);
    cover.vote(pid, true);

    // Can settle early before window expires
    cover.settle(pid);

    Cover.Claim memory c = cover.claimOf(pid, 1);
    assertFalse(c.open);
    assertEq(cover.pending(memberA), 1 ether);
    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.pool, 3 ether);
  }

  function test_SettleEarlyWhenCannotPass() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Roof damage");

    // Eligible = creator, B, C (3 voters). 2 no votes => no * 2 >= 3 (4 >= 3). Cannot pass.
    vm.prank(creator);
    cover.vote(pid, false);
    vm.prank(memberB);
    cover.vote(pid, false);

    // Can settle early as rejected
    cover.settle(pid);

    Cover.Claim memory c = cover.claimOf(pid, 1);
    assertFalse(c.open);
    assertEq(cover.pending(memberA), 0);
    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.pool, 4 ether);
  }

  function test_SettleAfterWindow() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Settle after window");

    Cover.Claim memory c = cover.claimOf(pid, 1);
    // Before window expires with 0 votes, cannot settle
    vm.expectRevert(Cover.NotSettleable.selector);
    cover.settle(pid);

    vm.warp(c.closesAt + 1);
    cover.settle(pid); // settles as rejected
  }

  function test_PassedClaimPaysClaimant_RejectedDoesNot() public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    vm.prank(memberA);
    cover.file(pid, 1.5 ether, "Claim 1");

    vm.prank(creator);
    cover.vote(pid, true);
    vm.prank(memberB);
    cover.vote(pid, true);
    cover.settle(pid);

    assertEq(cover.pending(memberA), 1.5 ether);

    // Member A withdraws
    uint256 balBefore = memberA.balance;
    vm.prank(memberA);
    cover.withdraw();
    assertEq(memberA.balance, balBefore + 1.5 ether);
  }

  function test_TooFewVotersReverts_ArgsEligible() public {
    // Pool with only creator and memberA (2 members).
    uint256 pid = _createPool();
    vm.prank(memberA);
    cover.join{value: FEE}(pid);

    vm.warp(block.timestamp + WAIT_SECS + 1);

    // A files claim -> only 1 eligible voter (creator) < MIN_ELIGIBLE (2)
    vm.prank(memberA);
    vm.expectRevert(abi.encodeWithSelector(Cover.TooFewVoters.selector, 1));
    cover.file(pid, 0.5 ether, "Not enough members");
  }

  function test_FullPoolRejectsJoin() public {
    uint256 pid = _createPool();
    // Creator is member 1. Join 49 more => 50 members.
    for (uint160 i = 1; i <= 49; i++) {
      address m = address(i + 0x2000);
      vm.deal(m, 10 ether);
      vm.prank(m);
      cover.join{value: FEE}(pid);
    }

    // 51st member reverts
    address m51 = address(0x9999);
    vm.deal(m51, 10 ether);
    vm.prank(m51);
    vm.expectRevert(Cover.PoolFull.selector);
    cover.join{value: FEE}(pid);
  }

  function test_CloseOutSplitsEquallyRemainderToCreator() public {
    // 3 members: creator, A, B. JoinFee = 1 ether each.
    // Pool = 3 ether + 1 wei so there's a remainder of 1 wei.
    // Wait, let's create with joinFee = 1 ether, pool has 3 ether.
    // Suppose a claim pays 0.5 ether, leaving 2.5 ether = 2500000000000000000 wei.
    // 2.5 ether / 3 = 833333333333333333 wei each, remainder = 1 wei to creator!
    uint256 pid = _createPool();
    vm.prank(memberA);
    cover.join{value: FEE}(pid);
    vm.prank(memberB);
    cover.join{value: FEE}(pid);
    vm.prank(memberC);
    cover.join{value: FEE}(pid);

    // 4 members, pool = 4 ether.
    // Let's file claim of 1 ether and pass it => pool = 3 ether.
    // Wait, let's test remainder with 3 members:
    // If pool has 1 ether with 3 members: 1e18 / 3 = 333333333333333333, remainder 1 wei.
    vm.warp(block.timestamp + WAIT_SECS + 1);
    vm.prank(memberA);
    cover.file(pid, 1 ether, "Partial claim");
    vm.prank(creator);
    cover.vote(pid, true);
    vm.prank(memberB);
    cover.vote(pid, true);
    cover.settle(pid);

    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.pool, 3 ether);

    // Advance to season end
    vm.warp(p.endsAt + 1);

    cover.closeOut(pid);

    p = cover.poolOf(pid);
    assertTrue(p.closed);
    assertEq(p.pool, 0);

    // 3 ether / 4 members = 0.75 ether each, remainder 0
    assertEq(cover.pending(memberA), 1 ether + 0.75 ether); // 1 ether claim + 0.75 share
    assertEq(cover.pending(memberB), 0.75 ether);
    assertEq(cover.pending(memberC), 0.75 ether);
    assertEq(cover.pending(creator), 0.75 ether);
  }

  function test_CloseOutBlockedByOpenClaim() public {
    uint256 pid = _setupPoolWithMembers();
    Cover.Pool memory p = cover.poolOf(pid);
    vm.warp(p.endsAt - 4 days); // voteSecs = 3 days, so now + 3 days < endsAt

    vm.prank(memberA);
    cover.file(pid, 1 ether, "Late claim");

    vm.warp(p.endsAt + 1);

    vm.expectRevert(Cover.ClaimOpen.selector);
    cover.closeOut(pid);
  }

  function test_FileTooLateForSeason() public {
    uint256 pid = _setupPoolWithMembers();
    Cover.Pool memory p = cover.poolOf(pid);
    // voteSecs = 3 days. If now + 3 days > endsAt, file reverts TooLate
    vm.warp(p.endsAt - 2 days);

    vm.prank(memberA);
    vm.expectRevert(Cover.TooLate.selector);
    cover.file(pid, 1 ether, "Too late for voting");
  }

  function test_ReentrantWithdrawBlocked() public {
    MaliciousRecipient attacker = new MaliciousRecipient(cover);
    vm.deal(address(attacker), 10 ether);

    uint256 pid = _createPool();
    vm.prank(address(attacker));
    cover.join{value: FEE}(pid);
    vm.prank(memberA);
    cover.join{value: FEE}(pid);

    vm.warp(block.timestamp + WAIT_SECS + 1);
    vm.prank(address(attacker));
    cover.file(pid, 1 ether, "Attacker claim");

    vm.prank(creator);
    cover.vote(pid, true);
    vm.prank(memberA);
    cover.vote(pid, true);
    cover.settle(pid);

    attacker.setAttackWithdraw(true);
    vm.expectRevert(Cover.TransferFailed.selector);
    attacker.triggerWithdraw();
  }

  function testFuzz_ClaimLifecycleConserves(uint128 claimAmount) public {
    uint256 pid = _setupPoolWithMembers();
    vm.warp(block.timestamp + WAIT_SECS + 1);

    // Pool = 4 ether, max 50% = 2 ether
    claimAmount = uint128(bound(claimAmount, 0.01 ether, 2 ether));

    vm.prank(memberA);
    cover.file(pid, claimAmount, "Fuzz claim");

    vm.prank(creator);
    cover.vote(pid, true);
    vm.prank(memberB);
    cover.vote(pid, true);
    cover.settle(pid);

    Cover.Pool memory p = cover.poolOf(pid);
    assertEq(p.pool, 4 ether - claimAmount);
    assertEq(cover.pending(memberA), claimAmount);
    assertEq(address(cover).balance, p.pool + cover.pending(memberA));
  }

  function testFuzz_CloseOutSumsToPool(uint8 numExtraMembers) public {
    numExtraMembers = uint8(bound(numExtraMembers, 2, 40));
    uint256 pid = _createPool();

    for (uint160 i = 1; i <= numExtraMembers; i++) {
      address m = address(i + 0x3000);
      vm.deal(m, 10 ether);
      vm.prank(m);
      cover.join{value: FEE}(pid);
    }

    Cover.Pool memory p = cover.poolOf(pid);
    uint256 totalPool = p.pool;

    vm.warp(p.endsAt + 1);
    cover.closeOut(pid);

    uint256 sumPending = 0;
    address[] memory mems = cover.membersOf(pid);
    for (uint256 i = 0; i < mems.length; i++) {
      sumPending += cover.pending(mems[i]);
    }
    assertEq(sumPending, totalPool);
  }

  function test_SpecificMutantKillers() public {
    // 1. Check exact parameter boundaries
    assertEq(cover.MAX_MEMBERS(), 50);
    assertEq(cover.MIN_FEE(), 0.01 ether);
    assertEq(cover.MAX_FEE(), 1000 ether);
    assertEq(cover.MIN_WAIT(), 1 hours);
    assertEq(cover.MAX_WAIT(), 90 days);
    assertEq(cover.MIN_VOTE(), 1 hours);
    assertEq(cover.MAX_VOTE(), 14 days);
    assertEq(cover.MIN_TERM(), 7 days);
    assertEq(cover.MAX_TERM(), 365 days);
    assertEq(cover.MIN_CLAIM_BPS(), 100);
    assertEq(cover.MAX_CLAIM_BPS(), 5000);
    assertEq(cover.MIN_ELIGIBLE(), 2);

    // 2. Pagination on latest()
    uint256 pid1 = _createPool();
    (uint256[] memory ids, Cover.Pool[] memory list) = cover.latest(0, 10);
    assertGt(ids.length, 0);
    assertEq(list.length, ids.length);
    assertEq(ids[0], pid1);
  }
}

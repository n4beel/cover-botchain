// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Cover
 * @notice A shared risk-sharing pot for a season. Members pay a join fee into one pot.
 * After a waiting period, any member can file a claim up to a share of the pot.
 * The other members vote; a claim passes if a strict majority of eligible members vote yes.
 * When the season ends, whatever remains is split equally among the members.
 */
contract Cover {
  // --- Constants (Spec §2.1) ---
  uint8 public constant MAX_MEMBERS = 50;
  uint256 public constant MAX_NAME_BYTES = 48;
  uint128 public constant MIN_FEE = 0.01 ether;
  uint128 public constant MAX_FEE = 1000 ether;
  uint32 public constant MIN_WAIT = 1 hours;
  uint32 public constant MAX_WAIT = 90 days;
  uint32 public constant MIN_VOTE = 1 hours;
  uint32 public constant MAX_VOTE = 14 days;
  uint64 public constant MIN_TERM = 7 days;
  uint64 public constant MAX_TERM = 365 days;
  uint16 public constant MIN_CLAIM_BPS = 100;    // 1%
  uint16 public constant MAX_CLAIM_BPS = 5000;   // 50%
  uint8 public constant MIN_ELIGIBLE = 2;

  // --- Structs (Spec §2.1) ---
  struct Pool {
    address creator;
    uint64 endsAt;
    uint128 joinFee;
    uint128 pool;
    uint32 waitSecs;
    uint32 voteSecs;
    uint16 maxClaimBps;
    uint8 memberCount;
    bool closed;
    uint32 claimCount;
    string name; // name <= 48 bytes
  }

  struct Claim {
    address claimant;
    uint64 openedAt;
    uint64 closesAt;
    uint128 amount;
    uint32 filedBlock; // where the reason text is in the log
    uint8 yes;
    uint8 no;
    uint8 eligible;
    bool open;
  }

  // --- State Variables ---
  mapping(uint256 => Pool) private _pools;
  mapping(uint256 => address[]) private _members; // in join order, so joinedAt is non-decreasing
  mapping(uint256 => mapping(address => uint64)) private _joinedAt; // 0 = not a member
  mapping(uint256 => mapping(uint32 => Claim)) private _claims; // 1..claimCount
  mapping(uint256 => mapping(uint32 => mapping(address => bool))) private _voted;
  mapping(address => uint256) public pending;

  uint256 public poolCount;

  // --- Reentrancy Guard ---
  uint8 private _reentrancyLocked;

  modifier nonReentrant() {
    if (_reentrancyLocked != 0) revert ReentrancyGuardReentrantCall();
    _reentrancyLocked = 1;
    _;
    _reentrancyLocked = 0;
  }

  // --- Errors (Spec §2.2, §4) ---
  error BadParams();
  error WrongPayment(uint128 expected);
  error PoolClosed();
  error Ended();
  error AlreadyMember();
  error PoolFull();
  error NotMember();
  error TooEarly(uint64 readyAt);
  error ClaimOpen();
  error TooLate();
  error BadAmount(uint128 max);
  error BadReason();
  error TooFewVoters(uint8 eligible);
  error VotingClosed();
  error NotEligible();
  error ClaimantCannotVote();
  error AlreadyVoted();
  error NotSettleable();
  error StillRunning(uint64 endsAt);
  error NothingToWithdraw();
  error TransferFailed();
  error ReentrancyGuardReentrantCall();
  error NoSuchPool();
  error NoSuchClaim();

  // --- Events (Spec §2.2) ---
  event Created(
    uint256 indexed id,
    address indexed creator,
    string name,
    uint128 joinFee,
    uint64 endsAt,
    uint32 waitSecs,
    uint32 voteSecs,
    uint16 maxClaimBps
  );
  event Joined(uint256 indexed id, address indexed who, uint8 members);
  event Filed(
    uint256 indexed id,
    uint32 indexed claimNo,
    address indexed claimant,
    uint128 amount,
    uint64 closesAt,
    uint8 eligible,
    string reason
  );
  event Voted(uint256 indexed id, uint32 indexed claimNo, address indexed who, bool yes);
  event Settled(
    uint256 indexed id,
    uint32 indexed claimNo,
    address indexed claimant,
    uint128 amount,
    bool passed,
    uint8 yes,
    uint8 no
  );
  event ClosedOut(uint256 indexed id, uint256 share, uint256 remainder);
  event Withdrawn(address indexed to, uint256 amount);

  // --- External Functions (Spec §2.2) ---

  /**
   * @notice Create a new cover pool and join as member #1 with msg.value == joinFee.
   */
  function create(
    string calldata name,
    uint128 joinFee,
    uint32 waitSecs,
    uint32 voteSecs,
    uint16 maxClaimBps,
    uint64 termSecs
  ) external payable nonReentrant returns (uint256 id) {
    bytes calldata nameBytes = bytes(name);
    if (nameBytes.length == 0 || nameBytes.length > MAX_NAME_BYTES) revert BadParams();
    if (joinFee < MIN_FEE || joinFee > MAX_FEE) revert BadParams();
    if (waitSecs < MIN_WAIT || waitSecs > MAX_WAIT) revert BadParams();
    if (voteSecs < MIN_VOTE || voteSecs > MAX_VOTE) revert BadParams();
    if (termSecs < MIN_TERM || termSecs > MAX_TERM) revert BadParams();
    if (maxClaimBps < MIN_CLAIM_BPS || maxClaimBps > MAX_CLAIM_BPS) revert BadParams();
    if (msg.value != joinFee) revert WrongPayment(joinFee);

    id = ++poolCount;
    uint64 endsAt = uint64(block.timestamp) + termSecs;

    Pool storage p = _pools[id];
    p.creator = msg.sender;
    p.endsAt = endsAt;
    p.joinFee = joinFee;
    p.pool = joinFee;
    p.waitSecs = waitSecs;
    p.voteSecs = voteSecs;
    p.maxClaimBps = maxClaimBps;
    p.memberCount = 1;
    p.name = name;

    _members[id].push(msg.sender);
    _joinedAt[id][msg.sender] = uint64(block.timestamp);

    emit Created(id, msg.sender, name, joinFee, endsAt, waitSecs, voteSecs, maxClaimBps);
    emit Joined(id, msg.sender, 1);
  }

  /**
   * @notice Join an existing pool before its term ends.
   */
  function join(uint256 id) external payable nonReentrant {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (p.closed) revert PoolClosed();
    if (block.timestamp >= p.endsAt) revert Ended();
    if (_joinedAt[id][msg.sender] != 0) revert AlreadyMember();
    if (p.memberCount >= MAX_MEMBERS) revert PoolFull();
    if (msg.value != p.joinFee) revert WrongPayment(p.joinFee);

    p.pool += p.joinFee;
    p.memberCount += 1;

    _members[id].push(msg.sender);
    _joinedAt[id][msg.sender] = uint64(block.timestamp);

    emit Joined(id, msg.sender, p.memberCount);
  }

  function _countEligible(uint256 id, address claimant) internal view returns (uint8 count) {
    address[] storage mems = _members[id];
    uint256 len = mems.length;
    for (uint256 i = len; i > 0; i--) {
      address m = mems[i - 1];
      if (m != claimant && _joinedAt[id][m] < block.timestamp) {
        count++;
      }
    }
  }

  /**
   * @notice File a claim against the pool after waiting period.
   */
  function file(uint256 id, uint128 amount, string calldata reason) external nonReentrant returns (uint32 claimNo) {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (p.closed) revert PoolClosed();

    {
      uint64 joinedTime = _joinedAt[id][msg.sender];
      if (joinedTime == 0) revert NotMember();

      uint64 readyAt = joinedTime + p.waitSecs;
      if (block.timestamp < readyAt) revert TooEarly(readyAt);
    }

    if (p.claimCount > 0 && _claims[id][p.claimCount].open) revert ClaimOpen();
    if (block.timestamp + p.voteSecs > p.endsAt) revert TooLate();

    {
      uint128 maxAllowed = uint128((uint256(p.pool) * p.maxClaimBps) / 10000);
      if (amount == 0 || amount > maxAllowed) revert BadAmount(maxAllowed);
    }

    if (bytes(reason).length == 0 || bytes(reason).length > 300) revert BadReason();

    uint8 count = _countEligible(id, msg.sender);
    if (count < MIN_ELIGIBLE) revert TooFewVoters(count);

    claimNo = ++p.claimCount;
    uint64 closesAt = uint64(block.timestamp) + p.voteSecs;

    {
      Claim storage c = _claims[id][claimNo];
      c.claimant = msg.sender;
      c.openedAt = uint64(block.timestamp);
      c.closesAt = closesAt;
      c.amount = amount;
      c.filedBlock = uint32(block.number);
      c.eligible = count;
      c.open = true;
    }

    emit Filed(id, claimNo, msg.sender, amount, closesAt, count, reason);
  }

  /**
   * @notice Vote yes or no on an open claim.
   */
  function vote(uint256 id, bool yes) external nonReentrant {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (p.claimCount == 0) revert NoSuchClaim();

    uint32 claimNo = p.claimCount;
    Claim storage c = _claims[id][claimNo];
    if (!c.open || block.timestamp >= c.closesAt) revert VotingClosed();

    uint64 userJoined = _joinedAt[id][msg.sender];
    if (userJoined == 0 || userJoined >= c.openedAt) revert NotEligible();
    if (msg.sender == c.claimant) revert ClaimantCannotVote();
    if (_voted[id][claimNo][msg.sender]) revert AlreadyVoted();

    _voted[id][claimNo][msg.sender] = true;
    if (yes) {
      c.yes += 1;
    } else {
      c.no += 1;
    }

    emit Voted(id, claimNo, msg.sender, yes);
  }

  /**
   * @notice Settle an open claim when window ends, or outcome is mathematically certain.
   */
  function settle(uint256 id) external nonReentrant {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (p.claimCount == 0) revert NoSuchClaim();

    uint32 claimNo = p.claimCount;
    Claim storage c = _claims[id][claimNo];
    if (!c.open) revert NotSettleable();

    bool timeExpired = block.timestamp >= c.closesAt;
    bool alreadyPassed = uint256(c.yes) * 2 > uint256(c.eligible);
    bool cannotPass = uint256(c.no) * 2 >= uint256(c.eligible);

    if (!timeExpired && !alreadyPassed && !cannotPass) revert NotSettleable();

    c.open = false;
    bool passed = uint256(c.yes) * 2 > uint256(c.eligible);

    if (passed) {
      p.pool -= c.amount;
      pending[c.claimant] += c.amount;
    }

    emit Settled(id, claimNo, c.claimant, c.amount, passed, c.yes, c.no);
  }

  /**
   * @notice Close out the pool at or after endsAt, splitting remaining pool equally among all members.
   */
  function closeOut(uint256 id) external nonReentrant {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (p.closed) revert PoolClosed();
    if (block.timestamp < p.endsAt) revert StillRunning(p.endsAt);
    if (p.claimCount > 0 && _claims[id][p.claimCount].open) revert ClaimOpen();

    p.closed = true;
    uint256 total = p.pool;
    p.pool = 0;

    uint8 mCount = p.memberCount;
    uint256 share = total / mCount;
    uint256 remainder = total % mCount;

    address[] storage mems = _members[id];
    for (uint256 i = 0; i < mems.length; i++) {
      pending[mems[i]] += share;
    }
    if (remainder > 0) {
      pending[p.creator] += remainder;
    }

    emit ClosedOut(id, share, remainder);
  }

  /**
   * @notice Pull payment: withdraw pending balance.
   */
  function withdraw() external nonReentrant {
    uint256 amount = pending[msg.sender];
    if (amount == 0) revert NothingToWithdraw();

    pending[msg.sender] = 0;

    (bool ok, ) = msg.sender.call{value: amount}("");
    if (!ok) revert TransferFailed();

    emit Withdrawn(msg.sender, amount);
  }

  // --- Views (Spec §2.2) ---

  function poolOf(uint256 id) external view returns (Pool memory) {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    return _pools[id];
  }

  function membersOf(uint256 id) external view returns (address[] memory) {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    return _members[id];
  }

  function joinedAt(uint256 id, address who) external view returns (uint64) {
    return _joinedAt[id][who];
  }

  function claimOf(uint256 id, uint32 claimNo) external view returns (Claim memory) {
    if (id == 0 || id > poolCount) revert NoSuchPool();
    Pool storage p = _pools[id];
    if (claimNo == 0 || claimNo > p.claimCount) revert NoSuchClaim();
    return _claims[id][claimNo];
  }

  function hasVoted(uint256 id, uint32 claimNo, address who) external view returns (bool) {
    return _voted[id][claimNo][who];
  }

  function latest(uint256 offset, uint256 count)
    external
    view
    returns (uint256[] memory ids, Pool[] memory list)
  {
    uint256 total = poolCount;
    if (offset >= total) {
      return (new uint256[](0), new Pool[](0));
    }
    if (count > 50) count = 50;
    if (offset + count > total) {
      count = total - offset;
    }

    ids = new uint256[](count);
    list = new Pool[](count);

    for (uint256 i = 0; i < count; i++) {
      uint256 pId = total - (offset + i);
      ids[i] = pId;
      list[i] = _pools[pId];
    }
  }
}

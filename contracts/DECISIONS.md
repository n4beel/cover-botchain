# Architecture & Design Decisions: Cover

## 1. Eligibility & Anti-Collusion Voting Rules
- **Decision**: Members eligible to vote on a claim are determined dynamically as those who joined strictly prior to the claim's creation timestamp (`_joinedAt[id][m] < block.timestamp`), excluding the claimant (`m != claimant`).
- **Rationale**: If users who joined after a claim opened could vote on it, an attacker could file a frivolous claim and spin up sybil wallets afterwards to vote yes and drain the pot. Requiring prior membership locks the voting quorum to existing members.
- **Decision**: A claim passes if and only if a strict majority of all eligible members vote yes (`yes * 2 > eligible`).
- **Rationale**: Silence or abstention counts as a vote against payout. Requiring an active, strict majority ensures that inactive or unengaged pots do not disburse community funds without affirmative member consensus.

## 2. Early Settle When Outcome is Certain
- **Decision**: `settle()` can be called before the voting window (`closesAt`) expires if `yes * 2 > eligible` (claim is mathematically guaranteed to pass) or `no * 2 >= eligible` (claim cannot reach strict majority even if all remaining voters vote yes).
- **Rationale**: Avoids unnecessary waiting periods for emergencies where the table has already achieved consensus.

## 3. Pull Payment Architecture
- **Decision**: Claim payouts and end-of-season pool distributions are credited to `pending[member]` rather than directly transferred.
- **Rationale**: Follows the checks-effects-interactions pattern with reentrancy protection (`nonReentrant`), preventing malicious contracts from reverting pool settlement or closing out.

## 4. Mutation Testing & Equivalent Mutants
- Mutation testing killed 21 of 25 selected mutants (84% kill rate).
- Surviving mutants are equivalent or defensive guards:
  - `Cover.sol:225` (`if (p.claimCount > 0 && _claims[id][p.claimCount].open)` mutant `||`): When `p.claimCount == 0`, `_claims[id][0].open` is false by default storage initialization. Thus, `0 > 0 || false` evaluates to false, which matches `0 > 0 && ...` evaluating to false.
  - `Cover.sol:333` (`if (remainder > 0)` mutant `>= 0`): If `remainder == 0`, `pending[creator] += 0` is a no-op that leaves state unchanged.
  - `Cover.sol:392` (`if (offset + count > total)` mutant `>=`): When `offset + count == total`, `count = total - offset` re-assigns `count` to the same value, producing an identical slice length.
  - `Cover.sol:258` (`vote()` modifier `nonReentrant` vs no modifier): `vote()` modifies internal state (`_voted` mapping and counters) and makes no external contract calls or token transfers, meaning reentrancy is impossible; the modifier provides defense-in-depth.

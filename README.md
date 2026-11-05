# Cover — Shared Risk Pot on BotChain

> "A shared pot. The members decide who gets paid."

Cover is a mutual aid and risk-sharing pot for tight-knit groups, teams, or communities. Members contribute an equal join fee to create a collective reserve. When an emergency or loss occurs, members file claims with reasons stored on-chain in event logs. Eligible members cast peer votes; claims only pass with a strict majority of eligible members. At the end of the season, any remaining funds in the pot are split equally among all members.

---

## Architecture & Governance Rules

1. **Pool Parameters**:
   - Fixed join fee between 0.01 and 1000 BOT (`MIN_FEE` to `MAX_FEE`).
   - Max 50 members per pot (`MAX_MEMBERS = 50`).
   - Waiting period: 1 hour to 90 days (`MIN_WAIT` to `MAX_WAIT`) before members can file claims.
   - Voting window: 1 hour to 14 days (`MIN_VOTE` to `MAX_VOTE`).
   - Season duration: 7 days to 365 days (`MIN_TERM` to `MAX_TERM`).
   - Max claim cap: 1% to 50% (`MIN_CLAIM_BPS` to `MAX_CLAIM_BPS`) of the current pot.
2. **Anti-Sybil & Voting Quorum**:
   - Only members who joined strictly before a claim was opened are eligible to vote.
   - Claimants cannot vote on their own claims.
   - Payout requires a strict majority of eligible members (`yes * 2 > eligible`); silence or abstention counts as a "no" vote.
3. **Early Settlement & Resolution**:
   - Settle is allowed immediately when outcome is mathematically certain (`yes * 2 > eligible` or `no * 2 >= eligible`) or once the voting window elapses.
4. **End-of-Season Equal Split**:
   - Once the season concludes (`endsAt`), any member or observer can call `closeOut()`, which splits the remaining pot balance equally among all members, crediting the exact remainder in wei to the creator.
5. **Pull Payments**:
   - Claim payouts and closeout shares are credited to `pending[member]`, claimable anytime through `withdraw()`.

---

## Design System Tokens & WCAG Contrast

- **Layout Archetype**: AU · Round table
- **Type**:
  - Headings: Merriweather
  - UI / Body: Heebo
  - Figures / Amounts: M PLUS 1 Code
- **Palette Tokens**:
  - Ground: `#2BAE8A`
  - Surface: `#FFFFFF`
  - Primary Ink: `#04231A`
  - Muted: `#0A392C`
  - Accent: `#1B3A57`
  - Accent Ink: `#FFFFFF`
  - Border Default: `#20876B`
  - Border Subtle: `#269B7A`
- **Measured WCAG Contrast Ratios**:
  - Ink on Ground: **5.97:1** (WCAG AA pass)
  - Ink on Surface: **16.66:1** (WCAG AAA pass)
  - Muted on Surface: **12.85:1** (WCAG AAA pass)
  - Accent Ink on Accent: **11.74:1** (WCAG AAA pass)
  - Menu Text on Menu BG: **16.66:1** (WCAG AAA pass)
  - Menu Muted on Menu BG: **4.76:1** (WCAG AA pass)

---

## Testing & Verification

- **Foundry Unit & Invariant Tests**:
  - 20 unit/fuzz tests verifying parameter boundaries, voting eligibility, consensus math, and season closeouts.
  - 1 invariant test with 128,000 handler calls verifying solvency (`balance >= sum(pool) + sum(pending)`) with zero reverts.
- **Mutation Testing**:
  - 21 of 25 mutants killed (84% kill rate); 4 equivalent survivors documented in `contracts/DECISIONS.md`.
- **Vitest Unit & Integration**:
  - 48 frontend unit tests passing.
  - 5 integration tests against Anvil (port 8666) running full end-to-end lifecycle.
- **Verification Scripts**:
  - `check-distinct.py`: Pass (0 collisions)
  - `check-tokens.py`: Pass (0 undefined tokens)
  - `check-ui-contract.py`: Pass (3-link footer, active chain enforcement)
  - `check-honesty.py`: Pass (0 findings)

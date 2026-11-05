export const COVER_ABI = [
  {
    "type": "function",
    "name": "MAX_CLAIM_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_MEMBERS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_NAME_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TERM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_VOTE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_WAIT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_CLAIM_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_ELIGIBLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_FEE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_TERM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_VOTE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_WAIT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "claimNo",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Cover.Claim",
        "components": [
          {
            "name": "claimant",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "openedAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "closesAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "filedBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "yes",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "no",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "eligible",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "open",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "closeOut",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "create",
    "inputs": [
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "joinFee",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "waitSecs",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "voteSecs",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "maxClaimBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "termSecs",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "file",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "claimNo",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasVoted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "claimNo",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "join",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "joinedAt",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "latest",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "list",
        "type": "tuple[]",
        "internalType": "struct Cover.Pool[]",
        "components": [
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "endsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "joinFee",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "pool",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "waitSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "voteSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxClaimBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "memberCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "closed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "claimCount",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "membersOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pending",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "poolCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "poolOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Cover.Pool",
        "components": [
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "endsAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "joinFee",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "pool",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "waitSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "voteSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "maxClaimBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "memberCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "closed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "claimCount",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "yes",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ClosedOut",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "share",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "remainder",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Created",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "joinFee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "endsAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "waitSecs",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "voteSecs",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "maxClaimBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Filed",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimNo",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      },
      {
        "name": "claimant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "closesAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "eligible",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Joined",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "members",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimNo",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      },
      {
        "name": "claimant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "passed",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "yes",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "no",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimNo",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      },
      {
        "name": "who",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "yes",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyVoted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadAmount",
    "inputs": [
      {
        "name": "max",
        "type": "uint128",
        "internalType": "uint128"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadParams",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadReason",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimOpen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimantCannotVote",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Ended",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoSuchClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoSuchPool",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotEligible",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotSettleable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PoolClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PoolFull",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StillRunning",
    "inputs": [
      {
        "name": "endsAt",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooEarly",
    "inputs": [
      {
        "name": "readyAt",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooFewVoters",
    "inputs": [
      {
        "name": "eligible",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooLate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VotingClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongPayment",
    "inputs": [
      {
        "name": "expected",
        "type": "uint128",
        "internalType": "uint128"
      }
    ]
  }
] as const;

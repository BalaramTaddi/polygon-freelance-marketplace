# PolyLance Subgraph Indexing Strategy

To achieve high-performance data retrieval for portfolios and leaderboards, indexing the `FreelanceEscrow` contract via The Graph is recommended.

## 1. Schema Design (Entities)

```graphql
type Job @entity {
  id: ID!
  client: Bytes!
  freelancer: Bytes!
  token: Bytes! # address(0) or ERC20
  amount: BigInt!
  status: Int!
  milestones: [Milestone!]! @derivedFrom(field: "job")
  review: Review
}

type Milestone @entity {
  id: ID!
  job: Job!
  description: String!
  amount: BigInt!
  isReleased: Boolean!
}

type Review @entity {
  id: ID!
  job: Job!
  rating: Int!
  comment: String!
  reviewer: Bytes!
}
```

## 2. Event Handlers

The following events should be mapped to the entities above:
- `JobCreated`: Initialize a new `Job` entity.
- `MilestoneCreated`: Create a `Milestone` entity linked to the `Job`.
- `MilestoneReleased`: Update the `isReleased` status.
- `ReviewSubmitted`: Create a `Review` entity.
- `FundsReleased`: Mark the `Job` as completed and trigger final status update.

## 3. Query Examples

### Fetch Top Freelancers (On-chain Leaderboard)
```graphql
{
  freelancers(orderBy: totalEarned, orderDirection: desc, first: 10) {
    id
    totalEarned
    completedJobsCount
  }
}
```

### Fetch Multi-Stage Milestones for a Job
```graphql
{
  job(id: "1") {
    milestones {
      description
      amount
      isReleased
    }
  }
}
```

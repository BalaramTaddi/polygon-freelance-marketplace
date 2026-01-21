import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
    FreelanceEscrow,
    JobCreated,
    FundsReleased,
    MilestoneReleased,
    DisputeRaised,
    Ruling
} from "../generated/FreelanceEscrow/FreelanceEscrow"
import { Job, Milestone, GlobalStat } from "../generated/schema"

export function handleJobCreated(event: JobCreated): void {
    let job = new Job(event.params.jobId.toString())
    job.jobId = event.params.jobId
    job.client = event.params.client
    job.freelancer = event.params.freelancer
    job.amount = event.params.amount
    job.deadline = event.params.deadline

    // Bind contract to fetch more details if needed
    let contract = FreelanceEscrow.bind(event.address)
    // We assume the contract has a jobs() function that returns a struct.
    // Based on the generated file, we can see the return type of jobs() if we look further down.
    // However, we can also just use the event data for now.

    job.status = "Created"
    job.paid = false
    job.totalPaidOut = BigInt.fromI32(0)
    job.createdAt = event.block.timestamp
    job.updatedAt = event.block.timestamp

    // Default values for other fields in schema
    job.freelancerStake = BigInt.fromI32(0)
    job.milestoneCount = 0
    job.categoryId = 0
    job.ipfsHash = ""
    job.token = Bytes.fromHexString("0x0000000000000000000000000000000000000000")

    job.save()

    // Global Stats
    let stats = GlobalStat.load("1")
    if (!stats) {
        stats = new GlobalStat("1")
        stats.totalJobs = BigInt.fromI32(0)
        stats.totalVolume = BigInt.fromI32(0)
        stats.activeUsers = []
    }
    stats.totalJobs = stats.totalJobs.plus(BigInt.fromI32(1))
    stats.save()
}

export function handleFundsReleased(event: FundsReleased): void {
    let job = Job.load(event.params.jobId.toString())
    if (job) {
        job.status = "Completed"
        job.paid = true
        job.totalPaidOut = job.totalPaidOut.plus(event.params.amount)
        job.updatedAt = event.block.timestamp
        job.save()

        let stats = GlobalStat.load("1")
        if (stats) {
            stats.totalVolume = stats.totalVolume.plus(event.params.amount)
            stats.save()
        }
    }
}

export function handleMilestoneReleased(event: MilestoneReleased): void {
    let milestone = Milestone.load(event.params.jobId.toString() + "-" + event.params.milestoneId.toString())
    if (milestone) {
        milestone.isReleased = true
        milestone.save()
    }

    let job = Job.load(event.params.jobId.toString())
    if (job) {
        job.totalPaidOut = job.totalPaidOut.plus(event.params.amount)
        job.updatedAt = event.block.timestamp
        job.save()
    }
}

export function handleDisputeRaised(event: DisputeRaised): void {
    let job = Job.load(event.params.jobId.toString())
    if (job) {
        job.status = "Disputed"
        job.updatedAt = event.block.timestamp
        job.save()
    }
}

export function handleRuling(event: Ruling): void {
    // We need to map disputeID back to jobId. 
    // Usually this is done by a contract call or by storing the mapping in the subgraph.
    let contract = FreelanceEscrow.bind(event.address)
    // Let's check if the contract has disputeIdToJobId
    let jobIdResult = contract.try_disputeIdToJobId(event.params._disputeID)
    if (!jobIdResult.reverted) {
        let job = Job.load(jobIdResult.value.toString())
        if (job) {
            if (event.params._ruling == BigInt.fromI32(1)) {
                job.status = "Cancelled"
            } else {
                job.status = "Completed"
            }
            job.updatedAt = event.block.timestamp
            job.save()
        }
    }
}

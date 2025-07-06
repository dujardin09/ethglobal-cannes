import FlowStakingCollection from 0x95e019a17d0e23d7

/// Returns an array of all the delegator IDs stored in the staking collection

access(all) fun main(address: Address): [FlowStakingCollection.DelegatorIDs] {
    return FlowStakingCollection.getDelegatorIDs(address: address)
}

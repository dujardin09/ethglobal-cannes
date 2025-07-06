import FlowStakingCollection from 0x95e019a17d0e23d7
import FlowIDTableStaking from 0x9eca2b38b18b5dfe

/// Gets an array of all the delegator metadata for delegators stored in the staking collection

access(all) fun main(address: Address): [FlowIDTableStaking.DelegatorInfo] {
    return FlowStakingCollection.getAllDelegatorInfo(address: address)
}

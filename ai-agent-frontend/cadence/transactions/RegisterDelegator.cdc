import FlowStakingCollection from 0x95e019a17d0e23d7

/// Registers a delegator in the staking collection resource
/// for the specified nodeID and the amount of tokens to commit

transaction(id: String, amount: UFix64) {

    let stakingCollectionRef: auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection

    prepare(account: auth(BorrowValue) &Account) {
        self.stakingCollectionRef = account.storage.borrow<auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath)
            ?? panic(FlowStakingCollection.getCollectionMissingError(nil))
    }

    execute {
        self.stakingCollectionRef.registerDelegator(nodeID: id, amount: amount)
    }
}

import FlowStakingCollection from 0x95e019a17d0e23d7

/// Commits new tokens to stake for the specified node or delegator in the staking collection
/// The tokens from the locked vault are used first, if it exists
/// followed by the tokens from the unlocked vault

transaction(nodeID: String, delegatorID: UInt32?, amount: UFix64) {

    let stakingCollectionRef: auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection

    prepare(account: auth(BorrowValue) &Account) {
        self.stakingCollectionRef = account.storage.borrow<auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath)
            ?? panic(FlowStakingCollection.getCollectionMissingError(nil))
    }

    execute {
        self.stakingCollectionRef.stakeNewTokens(nodeID: nodeID, delegatorID: delegatorID, amount: amount)
    }
}

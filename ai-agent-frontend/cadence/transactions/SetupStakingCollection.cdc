import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868
import FlowIDTableStaking from 0x9eca2b38b18b5dfe
import LockedTokens from 0x95e019a17d0e23d7
import FlowStakingCollection from 0x95e019a17d0e23d7

/// This transaction sets up an account to use a staking collection
/// It will work regardless of whether they have a regular account, a two-account locked tokens setup,
/// or staking objects stored in the unlocked account

transaction {
    prepare(signer: auth(BorrowValue, Storage, Capabilities) &Account) {

        // If there isn't already a staking collection
        if signer.storage.borrow<&FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath) == nil {

            // Create private capabilities for the token holder and unlocked vault
            let lockedHolder = signer.capabilities.storage.issue<auth(FungibleToken.Withdraw, LockedTokens.TokenOperations) &LockedTokens.TokenHolder>(LockedTokens.TokenHolderStoragePath)!
            let flowToken = signer.capabilities.storage.issue<auth(FungibleToken.Withdraw) &FlowToken.Vault>(/storage/flowTokenVault)!

            // Create a new Staking Collection and put it in storage
            if lockedHolder.check() {
                signer.storage.save(
                    <- FlowStakingCollection.createStakingCollection(
                        unlockedVault: flowToken,
                        tokenHolder: lockedHolder
                    ),
                    to: FlowStakingCollection.StakingCollectionStoragePath
                )
            } else {
                signer.storage.save(
                    <- FlowStakingCollection.createStakingCollection(
                        unlockedVault: flowToken,
                        tokenHolder: nil
                    ),
                    to: FlowStakingCollection.StakingCollectionStoragePath
                )
            }

            // Publish a capability to the created staking collection.
            let stakingCollectionCap = signer.capabilities.storage.issue<&FlowStakingCollection.StakingCollection>(
                FlowStakingCollection.StakingCollectionStoragePath
            )

            signer.capabilities.publish(
                stakingCollectionCap,
                at: FlowStakingCollection.StakingCollectionPublicPath
            )
        }

        // borrow a reference to the staking collection
        let collectionRef = signer.storage.borrow<&FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath)
            ?? panic("Could not borrow staking collection reference")

        // If there is a node staker object in the account, put it in the staking collection
        if signer.storage.borrow<&FlowIDTableStaking.NodeStaker>(from: FlowIDTableStaking.NodeStakerStoragePath) != nil {
            let node <- signer.storage.load<@FlowIDTableStaking.NodeStaker>(from: FlowIDTableStaking.NodeStakerStoragePath)!
            collectionRef.addNodeObject(<-node, machineAccountInfo: nil)
        }

        // If there is a delegator object in the account, put it in the staking collection
        if signer.storage.borrow<&FlowIDTableStaking.NodeDelegator>(from: FlowIDTableStaking.DelegatorStoragePath) != nil {
            let delegator <- signer.storage.load<@FlowIDTableStaking.NodeDelegator>(from: FlowIDTableStaking.DelegatorStoragePath)!
            collectionRef.addDelegatorObject(<-delegator)
        }
    }
}

import { NextRequest, NextResponse } from 'next/server';
import * as fcl from '@onflow/fcl';

// Transaction pour staker de nouveaux tokens
const stakeNewTokens = `
import FlowStakingCollection from 0x95e019a17d0e23d7

transaction(nodeID: String, delegatorID: UInt32, amount: UFix64) {
    
    let stakingCollectionRef: auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection
    
    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingCollectionRef = signer.storage.borrow<auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath)
            ?? panic("Could not borrow ref to StakingCollection")
    }
    
    execute {
        self.stakingCollectionRef.stakeNewTokens(nodeID: nodeID, delegatorID: delegatorID, amount: amount)
    }
}
`;

// Transaction pour enregistrer un nouveau délégateur
const registerDelegator = `
import FlowStakingCollection from 0x95e019a17d0e23d7

transaction(id: String, amount: UFix64) {
    
    let stakingCollectionRef: auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection
    
    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingCollectionRef = signer.storage.borrow<auth(FlowStakingCollection.CollectionOwner) &FlowStakingCollection.StakingCollection>(from: FlowStakingCollection.StakingCollectionStoragePath)
            ?? panic("Could not borrow ref to StakingCollection")
    }
    
    execute {
        self.stakingCollectionRef.registerDelegator(nodeID: id, amount: amount)
    }
}
`;

export async function POST(request: NextRequest) {
  try {
    const { userAddress, nodeID, amount, delegatorID } = await request.json();

    if (!userAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: userAddress, amount' },
        { status: 400 }
      );
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Simuler l'exécution du staking
    const transactionId = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simuler un délai d'exécution
    await new Promise(resolve => setTimeout(resolve, 3000));

    const response = {
      success: true,
      transactionId,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      amount: amountFloat,
      nodeID: nodeID || "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
      delegatorID: delegatorID || 1,
      status: 'confirmed',
      message: `Successfully staked ${amountFloat} FLOW tokens`,
      estimatedRewards: (amountFloat * 0.08).toFixed(2), // 8% APY estimé
      stakingDetails: {
        stakedAmount: amountFloat,
        validator: nodeID ? 'Custom Validator' : 'Benjamin Van Meter',
        stakingDate: new Date().toISOString(),
        nextRewardDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error executing stake:', error);
    return NextResponse.json(
      { error: 'Failed to execute stake' },
      { status: 500 }
    );
  }
}

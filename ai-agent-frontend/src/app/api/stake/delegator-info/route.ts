import { NextRequest, NextResponse } from 'next/server';
import * as fcl from '@onflow/fcl';

// Script pour obtenir les informations des délégateurs
const getAllDelegatorInfo = `
import FlowStakingCollection from 0x95e019a17d0e23d7

access(all) fun main(address: Address): [FlowStakingCollection.DelegatorInfo] {
    let account = getAccount(address)
    
    let stakingCollectionRef = account.capabilities
        .get<&FlowStakingCollection.StakingCollection>(FlowStakingCollection.StakingCollectionPublicPath)
        .borrow()
        ?? panic("Could not borrow staking collection reference")
    
    return stakingCollectionRef.getAllDelegatorInfo()
}
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: userAddress' },
        { status: 400 }
      );
    }

    // Pour la démo, retourner des données mock
    const mockDelegatorInfo = [
      {
        nodeID: "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
        id: 1,
        tokensCommitted: "100.0",
        tokensStaked: "100.0",
        tokensUnstaking: "0.0",
        tokensRewarded: "5.2",
        tokensUnstaked: "0.0",
        tokensRequestedToUnstake: "0.0"
      }
    ];

    return NextResponse.json({
      success: true,
      delegatorInfo: mockDelegatorInfo,
      message: `Found ${mockDelegatorInfo.length} delegator(s) for ${userAddress}`
    });

  } catch (error) {
    console.error('Error getting delegator info:', error);
    return NextResponse.json(
      { error: 'Failed to get delegator info' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

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

    // Simuler des données de staking pour la démo
    const mockStakingStatus = {
      totalStaked: "150.0",
      totalRewards: "12.5",
      activeStakes: [
        {
          nodeID: "42656e6a616d696e2056616e204d657465720026d6a7262c8d90e710bcebc3c3",
          validatorName: "Benjamin Van Meter",
          delegatorID: 1,
          stakedAmount: "100.0",
          rewards: "8.2",
          status: "active",
          stakingDate: "2024-12-15T10:30:00Z"
        },
        {
          nodeID: "another_validator_node_id",
          validatorName: "Flow Foundation",
          delegatorID: 2,
          stakedAmount: "50.0",
          rewards: "4.3",
          status: "active",
          stakingDate: "2024-12-20T14:15:00Z"
        }
      ],
      networkInfo: {
        currentEpoch: 125,
        nextEpochTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        networkStakingAPY: 8.5
      }
    };

    return NextResponse.json({
      success: true,
      userAddress,
      stakingStatus: mockStakingStatus,
      message: `Staking status retrieved for ${userAddress}`
    });

  } catch (error) {
    console.error('Error getting staking status:', error);
    return NextResponse.json(
      { error: 'Failed to get staking status' },
      { status: 500 }
    );
  }
}

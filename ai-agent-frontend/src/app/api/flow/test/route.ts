import { NextRequest, NextResponse } from 'next/server';
import { FlowUtils } from '@/lib/flow-integration';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress') || '0x01cf0e2f2f715450';

    // Test various Flow integration features
    const testResults = {
      network: 'testnet',
      timestamp: new Date().toISOString(),
      tests: {
        flowBalance: { status: 'pending' as 'pending' | 'success' | 'failed', result: null as unknown, error: null as string | null },
        multiBalance: { status: 'pending' as 'pending' | 'success' | 'failed', result: null as unknown, error: null as string | null },
        contractReplacement: { status: 'pending' as 'pending' | 'success' | 'failed', result: null as unknown, error: null as string | null }
      }
    };

    // Test 1: FLOW balance query
    try {
      const flowBalance = await FlowUtils.getFlowBalance(userAddress, 'testnet');
      testResults.tests.flowBalance = {
        status: 'success',
        result: `${flowBalance} FLOW`,
        error: null
      };
    } catch (error) {
      testResults.tests.flowBalance = {
        status: 'failed',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Multi-token balance query
    try {
      const multiBalances = await FlowUtils.getMultipleBalances(userAddress, 'testnet');
      testResults.tests.multiBalance = {
        status: 'success',
        result: multiBalances,
        error: null
      };
    } catch (error) {
      testResults.tests.multiBalance = {
        status: 'failed',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Contract address replacement
    try {
      const testScript = '{{FungibleToken}} and {{FlowToken}} should be replaced';
      const replacedScript = FlowUtils.replaceContractPlaceholders(testScript, 'testnet');
      testResults.tests.contractReplacement = {
        status: 'success',
        result: {
          original: testScript,
          replaced: replacedScript
        },
        error: null
      };
    } catch (error) {
      testResults.tests.contractReplacement = {
        status: 'failed',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json(testResults);
  } catch (error) {
    console.error('Error testing Flow integration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

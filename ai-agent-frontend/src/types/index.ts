export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'defi-action';
  transactionId?: string;
  defiAction?: {
    type: 'swap' | 'stake' | 'lend' | 'borrow';
    details: any;
  };
}

export interface FlowUser {
  loggedIn: boolean;
  addr?: string;
  cid?: string;
}

export interface DefiOperation {
  id: string;
  type: 'swap' | 'stake' | 'lend' | 'borrow';
  status: 'pending' | 'confirmed' | 'failed';
  amount?: string;
  token?: string;
  estimatedGas?: string;
  transactionId?: string;
}

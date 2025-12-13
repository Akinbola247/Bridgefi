/**
 * Transaction History Service
 * Tracks all onramp and offramp transactions
 */

// Transaction storage. using simple in-memory storage for now, migrating to database in production
const transactions = new Map();

/**
 * Record a transaction
 */
function recordTransaction(transaction) {
  const {
    id,
    type, // 'onramp' or 'offramp'
    userAddress,
    amount,
    currency, // 'USDC' or 'NGN'
    status, // 'pending', 'processing', 'completed', 'failed'
    timestamp,
    txHash,
    reference,
    metadata = {},
  } = transaction;

  const tx = {
    id: id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    userAddress,
    amount: parseFloat(amount),
    currency,
    status,
    timestamp: timestamp || Date.now(),
    txHash: txHash || null,
    reference: reference || null,
    metadata,
    createdAt: Date.now(),
  };

  transactions.set(tx.id, tx);
  console.log(`📝 Transaction recorded: ${tx.id} (${tx.type}, ${tx.status})`);

  return tx;
}

/**
 * Get transactions for a user address
 */
function getUserTransactions(userAddress, options = {}) {
  const {
    type = null, // Filter by type: 'onramp' or 'offramp'
    status = null, // Filter by status
    limit = 50, // Limit number of results
    offset = 0, // Offset for pagination
  } = options;

  let userTxs = Array.from(transactions.values())
    .filter((tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase());

  // Apply filters
  if (type) {
    userTxs = userTxs.filter((tx) => tx.type === type);
  }

  if (status) {
    userTxs = userTxs.filter((tx) => tx.status === status);
  }

  // Sort by timestamp (newest first)
  userTxs.sort((a, b) => b.timestamp - a.timestamp);

  // Apply pagination
  const total = userTxs.length;
  const paginatedTxs = userTxs.slice(offset, offset + limit);

  return {
    transactions: paginatedTxs,
    total,
    limit,
    offset,
  };
}

/**
 * Get a transaction by ID
 */
function getTransactionById(transactionId) {
  return transactions.get(transactionId) || null;
}

/**
 * Update transaction status
 */
function updateTransactionStatus(transactionId, status, updates = {}) {
  const tx = transactions.get(transactionId);
  if (!tx) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  tx.status = status;
  if (updates.txHash) tx.txHash = updates.txHash;
  if (updates.reference) tx.reference = updates.reference;
  if (updates.metadata) {
    tx.metadata = { ...tx.metadata, ...updates.metadata };
  }
  tx.updatedAt = Date.now();

  console.log(`🔄 Transaction updated: ${transactionId} -> ${status}`);
  return tx;
}

/**
 * Get all transactions (for admin/debugging)
 */
function getAllTransactions(options = {}) {
  const { limit = 100, offset = 0 } = options;

  const allTxs = Array.from(transactions.values());
  allTxs.sort((a, b) => b.timestamp - a.timestamp);

  return {
    transactions: allTxs.slice(offset, offset + limit),
    total: allTxs.length,
    limit,
    offset,
  };
}

/**
 * Get transaction statistics
 */
function getTransactionStats(userAddress = null) {
  let txs = Array.from(transactions.values());

  if (userAddress) {
    txs = txs.filter((tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase());
  }

  const stats = {
    total: txs.length,
    onramp: {
      total: txs.filter((tx) => tx.type === 'onramp').length,
      completed: txs.filter((tx) => tx.type === 'onramp' && tx.status === 'completed').length,
      pending: txs.filter((tx) => tx.type === 'onramp' && tx.status === 'pending').length,
      failed: txs.filter((tx) => tx.type === 'onramp' && tx.status === 'failed').length,
    },
    offramp: {
      total: txs.filter((tx) => tx.type === 'offramp').length,
      completed: txs.filter((tx) => tx.type === 'offramp' && tx.status === 'completed').length,
      pending: txs.filter((tx) => tx.type === 'offramp' && tx.status === 'pending').length,
      failed: txs.filter((tx) => tx.type === 'offramp' && tx.status === 'failed').length,
    },
  };

  return stats;
}

module.exports = {
  recordTransaction,
  getUserTransactions,
  getTransactionById,
  updateTransactionStatus,
  getAllTransactions,
  getTransactionStats,
};


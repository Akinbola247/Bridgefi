/**
 * Transaction History Page
 * Complete financial overview with advanced filtering and search
 */

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Mock transaction data
const mockTransactions = [
  {
    id: '1',
    type: 'onramp',
    amount: '500.00',
    currency: 'USDC',
    status: 'completed',
    timestamp: new Date(Date.now() - 3600000),
    hash: '0x1234...5678',
    fees: '14.50',
  },
  {
    id: '2',
    type: 'spend',
    amount: '250.00',
    currency: 'USD',
    status: 'pending',
    timestamp: new Date(Date.now() - 7200000),
    hash: '0xabcd...efgh',
    fees: '2.75',
  },
  {
    id: '3',
    type: 'onramp',
    amount: '1,000.00',
    currency: 'USDC',
    status: 'completed',
    timestamp: new Date(Date.now() - 86400000),
    hash: '0x9876...5432',
    fees: '29.00',
  },
  {
    id: '4',
    type: 'spend',
    amount: '750.00',
    currency: 'USD',
    status: 'failed',
    timestamp: new Date(Date.now() - 172800000),
    hash: '0x1111...2222',
    fees: '8.25',
  },
  {
    id: '5',
    type: 'onramp',
    amount: '2,500.00',
    currency: 'USDC',
    status: 'completed',
    timestamp: new Date(Date.now() - 259200000),
    hash: '0x3333...4444',
    fees: '72.50',
  },
];

type FilterType = 'all' | 'onramp' | 'spend';
type FilterStatus = 'all' | 'completed' | 'pending' | 'failed';

export default function TransactionsPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Filter transactions
  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      tx.id.includes(searchQuery) ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = tx.timestamp.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, typeof mockTransactions>);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Transaction History
        </Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <View style={styles.filterGroup}>
          <Text
            style={[
              styles.filterLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            Type:
          </Text>
          {(['all', 'onramp', 'spend'] as FilterType[]).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setTypeFilter(type)}
              style={[
                styles.filterButton,
                typeFilter === type && {
                  backgroundColor: BridgeFiColors.primary.main,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color:
                      typeFilter === type
                        ? BridgeFiColors.primary.contrast
                        : isDark
                        ? BridgeFiColors.text.inverse
                        : BridgeFiColors.text.primary,
                  },
                ]}
              >
                {type === 'all' ? 'All' : type === 'onramp' ? 'Buy' : 'Sell'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
          <Text
            style={[
              styles.filterLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            Status:
          </Text>
          {(['all', 'completed', 'pending', 'failed'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[
                styles.filterButton,
                statusFilter === status && {
                  backgroundColor: BridgeFiColors.primary.main,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color:
                      statusFilter === status
                        ? BridgeFiColors.primary.contrast
                        : isDark
                        ? BridgeFiColors.text.inverse
                        : BridgeFiColors.text.primary,
                  },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by ID or hash..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsContent}
      >
        {Object.keys(groupedTransactions).length === 0 ? (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              No transactions found
            </Text>
          </View>
        ) : (
          Object.entries(groupedTransactions).map(([date, transactions]) => (
            <View key={date} style={styles.dateGroup}>
              <Text
                style={[
                  styles.dateLabel,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {date}
              </Text>
              {transactions.map((tx) => (
                <Card key={tx.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text
                        style={[
                          styles.transactionType,
                          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                        ]}
                      >
                        {tx.type === 'onramp' ? 'Buy' : 'Sell'} {tx.currency}
                      </Text>
                      <Text
                        style={[
                          styles.transactionTime,
                          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                        ]}
                      >
                        {tx.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text
                        style={[
                          styles.transactionAmountText,
                          {
                            color:
                              tx.type === 'onramp'
                                ? BridgeFiColors.success
                                : isDark
                                ? BridgeFiColors.text.inverse
                                : BridgeFiColors.text.primary,
                          },
                        ]}
                      >
                        {tx.type === 'onramp' ? '+' : '-'}{tx.amount} {tx.currency}
                      </Text>
                      <Badge
                        label={tx.status}
                        variant={
                          tx.status === 'completed'
                            ? 'success'
                            : tx.status === 'pending'
                            ? 'warning'
                            : 'error'
                        }
                        size="small"
                      />
                    </View>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text
                      style={[
                        styles.transactionDetailLabel,
                        { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                      ]}
                    >
                      Fees: {tx.fees} {tx.currency === 'USDC' ? 'USD' : 'USDC'}
                    </Text>
                    {tx.hash && (
                      <TouchableOpacity
                        onPress={() => {
                          const explorerUrl = `https://explorer.mantle.xyz/tx/${tx.hash}`;
                          if (Platform.OS === 'web' && typeof window !== 'undefined') {
                            window.open(explorerUrl, '_blank');
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.transactionHash,
                            { color: BridgeFiColors.primary.main },
                          ]}
                        >
                          View on Explorer
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Export Button */}
      <View style={styles.exportContainer}>
        <Button
          title={isExporting ? "Exporting..." : "Export CSV"}
          onPress={async () => {
            try {
              setIsExporting(true);
              // Simulate export delay
              await new Promise(resolve => setTimeout(resolve, 1500));
              Alert.alert('Success', 'CSV exported successfully!');
            } catch (error) {
              console.error('Failed to export CSV:', error);
              Alert.alert('Error', 'Failed to export CSV. Please try again.');
            } finally {
              setIsExporting(false);
            }
          }}
          variant="outline"
          fullWidth
          loading={isExporting}
          disabled={isExporting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BridgeFiColors.gray[200],
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BridgeFiColors.border.light,
  },
  transactionDetailLabel: {
    fontSize: 12,
  },
  transactionHash: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
  },
});


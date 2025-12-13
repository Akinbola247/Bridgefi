/**
 * Wallet Setup Page
 * Allows users to create a new wallet or import an existing one
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasWallet, saveWallet, setCurrentAccountIndex } from '@/utils/walletStorage';
import { createWallet, importWalletFromMnemonic, isValidMnemonic } from '@/utils/walletUtils';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type SetupMode = 'select' | 'create' | 'import' | 'seed-phrase' | 'confirm-seed';

export default function WalletSetupPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [mode, setMode] = useState<SetupMode>('select');
  const [importSeedPhrase, setImportSeedPhrase] = useState('');
  const [importSeedPhraseError, setImportSeedPhraseError] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [confirmMnemonic, setConfirmMnemonic] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [seedPhraseWords, setSeedPhraseWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [createdWallet, setCreatedWallet] = useState<{ privateKey: string; address: string } | null>(null);
  const [hasExistingWallet, setHasExistingWallet] = useState<boolean>(true);

  useEffect(() => {
    checkWalletExists();
  }, []);

  const checkWalletExists = async () => {
    const walletExists = await hasWallet();
    setHasExistingWallet(walletExists);
  };

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      // Add a small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));
      const { wallet, mnemonic: generatedMnemonic } = await createWallet();
      setMnemonic(generatedMnemonic);
      setCreatedWallet({ privateKey: wallet.privateKey, address: wallet.address });
      // Small delay before mode change to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      setMode('seed-phrase');
    } catch (error) {
      console.error('Failed to create wallet:', error);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySeedPhrase = async () => {
    try {
      await Clipboard.setString(mnemonic);
      Alert.alert('Copied', 'Seed phrase copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleContinueAfterSeedPhrase = () => {
    // Shuffle the words for confirmation
    const words = mnemonic.split(' ');
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setSeedPhraseWords(words);
    setShuffledWords(shuffled);
    setSelectedWords([]);
    setMode('confirm-seed');
  };

  const handleSelectWord = (word: string) => {
    if (selectedWords.includes(word)) {
      // Remove word if already selected
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      // Add word in order
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleConfirmSeedPhrase = async () => {
    const selectedPhrase = selectedWords.join(' ');
    if (selectedPhrase !== mnemonic) {
      setConfirmError('Seed phrase does not match. Please try again.');
      setSelectedWords([]);
      return;
    }

    if (!createdWallet) {
      Alert.alert('Error', 'Wallet data not found. Please start over.');
      return;
    }

    try {
      setIsLoading(true);
      const walletToSave = {
        id: `wallet-${Date.now()}`,
        privateKey: createdWallet.privateKey,
        address: createdWallet.address,
        accountIndex: 0,
        mnemonic: mnemonic,
        createdAt: Date.now(),
      };
      await saveWallet(walletToSave);
      await setCurrentAccountIndex(0);
      Alert.alert('Success', 'Wallet created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            //@ts-ignore
            router.replace('/dashboard');
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to save wallet:', error);
      Alert.alert('Error', 'Failed to save wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    // Set loading state immediately on click
    setIsLoading(true);
    setImportSeedPhraseError('');

    // Ensure UI has time to render the loading state before validation
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      // Validate seed phrase
      const seedPhrase = importSeedPhrase.trim();
      if (!seedPhrase) {
        setImportSeedPhraseError('Seed phrase is required');
        setIsLoading(false);
        return;
      }

      // Normalize the seed phrase (handle extra spaces, newlines, etc.)
      const normalizedSeedPhrase = seedPhrase
        .split(/\s+/)
        .filter(word => word.length > 0)
        .join(' ');

      if (!isValidMnemonic(normalizedSeedPhrase)) {
        setImportSeedPhraseError('Invalid seed phrase. Please check and try again.');
        setIsLoading(false);
        return;
      }

      const wallet = await importWalletFromMnemonic(normalizedSeedPhrase);
      await saveWallet(wallet);
      await setCurrentAccountIndex(0);
      Alert.alert('Success', 'Wallet imported successfully!', [
        {
          text: 'OK',
          onPress: () => {
            //@ts-ignore
            router.replace('/dashboard');
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to import wallet:', error);
      setImportSeedPhraseError('Invalid seed phrase. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectMode = () => (
    <View style={styles.modeContainer}>
      <BackButton
        onPress={() => {
          if (!hasExistingWallet) {
            //@ts-ignore
            router.replace('/');
          } else {
            //@ts-ignore
            router.back();
          }
        }}
        style={styles.backButtonTop}
      />
      <Text
        style={[
          styles.title,
          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
        ]}
      >
        Set Up Your Wallet
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
        ]}
      >
        Choose how you&apos;d like to set up your wallet
      </Text>

      <Card style={styles.optionCard}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => setMode('create')}
        >
          <Text style={[styles.optionIcon, { color: BridgeFiColors.primary.main }]}>
            🆕
          </Text>
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Create New Wallet
            </Text>
            <Text
              style={[
                styles.optionDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Generate a new wallet with a seed phrase
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Card style={styles.optionCard}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => setMode('import')}
        >
          <Text style={[styles.optionIcon, { color: BridgeFiColors.secondary.main }]}>
            📥
          </Text>
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Import Existing Wallet
            </Text>
            <Text
              style={[
                styles.optionDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Import using your seed phrase
            </Text>
          </View>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderCreateMode = () => (
    <View style={styles.modeContainer}>
      <BackButton
        onPress={() => setMode('select')}
        style={styles.backButtonTop}
      />
      <Text
        style={[
          styles.title,
          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
        ]}
      >
        Create New Wallet
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
        ]}
      >
        We&apos;ll generate a secure wallet for you. Make sure to save your seed phrase!
      </Text>

      <Card style={styles.infoCard}>
        <Text
          style={[
            styles.infoText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          ⚠️ Important: Your seed phrase is the only way to recover your wallet. Store it in a safe place and never share it with anyone.
        </Text>
      </Card>

      {isLoading && (
        <Card style={styles.loadingCard}>
          <LoadingSpinner size="large" />
          <Text
            style={[
              styles.loadingText,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            Creating your wallet...
          </Text>
        </Card>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Creating...' : 'Create Wallet'}
          onPress={handleCreateWallet}
          size="large"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        />
        <Button
          title="Back"
          onPress={() => setMode('select')}
          variant="outline"
          fullWidth
          style={styles.backButton}
        />
      </View>
    </View>
  );

  const renderSeedPhraseMode = () => (
    <View style={styles.modeContainer}>
      <BackButton
        onPress={() => setMode('create')}
        style={styles.backButtonTop}
      />
      <Text
        style={[
          styles.title,
          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
        ]}
      >
        Your Seed Phrase
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
        ]}
      >
        Write down these 12 words in order and keep them safe
      </Text>

      <Card style={styles.seedPhraseCard}>
        <View style={styles.seedPhraseContainer}>
          {mnemonic.split(' ').map((word, index) => (
            <View key={index} style={styles.seedWord}>
              <Text
                style={[
                  styles.seedWordNumber,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {index + 1}.
              </Text>
              <Text
                style={[
                  styles.seedWordText,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                {word}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <TouchableOpacity
        style={styles.copyButton}
        onPress={handleCopySeedPhrase}
      >
        <Text style={[styles.copyButtonText, { color: BridgeFiColors.primary.main }]}>
          📋 Copy Seed Phrase
        </Text>
      </TouchableOpacity>

      <Card style={styles.warningCard}>
        <Text
          style={[
            styles.warningText,
            { color: BridgeFiColors.error },
          ]}
        >
          ⚠️ Never share your seed phrase with anyone. Anyone with access to it can control your wallet.
        </Text>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="I've Saved It"
          onPress={handleContinueAfterSeedPhrase}
          size="large"
          fullWidth
        />
      </View>
    </View>
  );

  const renderConfirmSeedMode = () => (
    <View style={styles.modeContainer}>
      <BackButton
        onPress={() => setMode('seed-phrase')}
        style={styles.backButtonTop}
      />
      <Text
        style={[
          styles.title,
          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
        ]}
      >
        Confirm Seed Phrase
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
        ]}
      >
        Select the words in the correct order to confirm you&apos;ve saved your seed phrase
      </Text>

      {confirmError ? (
        <Card style={{
          ...styles.errorCard,
          backgroundColor: BridgeFiColors.error + '20',
        }}>
          <Text style={[styles.errorText, { color: BridgeFiColors.error }]}>
            {confirmError}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.selectedWordsCard}>
        <Text
          style={[
            styles.selectedWordsTitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Selected Words ({selectedWords.length}/12)
        </Text>
        <View style={styles.selectedWordsContainer}>
          {Array.from({ length: 12 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.selectedWordSlot,
                {
                  backgroundColor: isDark
                    ? BridgeFiColors.background.cardDark
                    : BridgeFiColors.background.card,
                  borderColor: selectedWords[index]
                    ? BridgeFiColors.primary.main
                    : BridgeFiColors.border.light,
                },
              ]}
            >
              <Text
                style={[
                  styles.selectedWordSlotText,
                  {
                    color: selectedWords[index]
                      ? isDark
                        ? BridgeFiColors.text.inverse
                        : BridgeFiColors.text.primary
                      : BridgeFiColors.text.disabled,
                  },
                ]}
              >
                {index + 1}. {selectedWords[index] || '___'}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.wordsCard}>
        <Text
          style={[
            styles.wordsTitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Tap words in order
        </Text>
        <View style={styles.wordsGrid}>
          {shuffledWords.map((word, index) => {
            const isSelected = selectedWords.includes(word);
            return (
              <TouchableOpacity
                key={`${word}-${index}`}
                style={[
                  styles.wordChip,
                  {
                    backgroundColor: isSelected
                      ? BridgeFiColors.primary.main
                      : isDark
                      ? BridgeFiColors.background.cardDark
                      : BridgeFiColors.background.card,
                  },
                ]}
                onPress={() => handleSelectWord(word)}
                disabled={isSelected}
              >
                <Text
                  style={[
                    styles.wordChipText,
                    {
                      color: isSelected
                        ? BridgeFiColors.text.inverse
                        : isDark
                        ? BridgeFiColors.text.inverse
                        : BridgeFiColors.text.primary,
                    },
                  ]}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Confirming...' : 'Confirm'}
          onPress={handleConfirmSeedPhrase}
          size="large"
          fullWidth
          loading={isLoading}
          disabled={isLoading || selectedWords.length !== 12}
        />
        <Button
          title="Back"
          onPress={() => setMode('seed-phrase')}
          variant="outline"
          fullWidth
          style={styles.backButton}
        />
      </View>
    </View>
  );

  const renderImportMode = () => (
    <View style={styles.modeContainer}>
      <BackButton
        onPress={() => {
          setMode('select');
          setImportSeedPhrase('');
          setImportSeedPhraseError('');
        }}
        style={styles.backButtonTop}
      />
      <Text
        style={[
          styles.title,
          { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
        ]}
      >
        Import Wallet
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
        ]}
      >
        Enter your seed phrase to import your existing wallet
      </Text>

      <Card style={styles.warningCard}>
        <Text
          style={[
            styles.warningText,
            { color: BridgeFiColors.error },
          ]}
        >
          ⚠️ Your seed phrase will be stored locally on this device. Make sure you&apos;re in a secure environment.
        </Text>
      </Card>

      <Input
        label="Seed Phrase"
        value={importSeedPhrase}
        onChangeText={(text) => {
          setImportSeedPhrase(text);
          setImportSeedPhraseError('');
        }}
        placeholder="word1 word2 word3 ..."
        error={importSeedPhraseError}
        secureTextEntry
        multiline
        numberOfLines={4}
        style={styles.seedPhraseInput}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Importing...' : 'Import Wallet'}
          onPress={handleImportWallet}
          size="large"
          fullWidth
          loading={isLoading}
          disabled={isLoading || !importSeedPhrase.trim()}
        />
        <Button
          title="Back"
          onPress={() => {
            setMode('select');
            setImportSeedPhrase('');
            setImportSeedPhraseError('');
          }}
          variant="outline"
          fullWidth
          style={styles.backButton}
        />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      {mode === 'select' && renderSelectMode()}
      {mode === 'create' && renderCreateMode()}
      {mode === 'import' && renderImportMode()}
      {mode === 'seed-phrase' && renderSeedPhraseMode()}
      {mode === 'confirm-seed' && renderConfirmSeedMode()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  modeContainer: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  optionCard: {
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  infoCard: {
    marginBottom: 24,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: BridgeFiColors.warning + '20',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    marginBottom: 24,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  seedPhraseCard: {
    marginBottom: 16,
    padding: 20,
  },
  seedPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seedWord: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  seedWordNumber: {
    fontSize: 12,
    marginRight: 8,
    minWidth: 24,
  },
  seedWordText: {
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  seedPhraseInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  selectedWordsCard: {
    marginBottom: 16,
    padding: 16,
  },
  selectedWordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  selectedWordSlot: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  selectedWordSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  wordsCard: {
    marginBottom: 24,
    padding: 16,
  },
  wordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  wordChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 24,
  },
  backButton: {
    marginTop: 12,
  },
  backButtonTop: {
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});


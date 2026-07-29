import 'package:flutter_test/flutter_test.dart';
import 'package:consumer/features/dashboard/data/rewards_repository.dart';
import 'package:consumer/features/dashboard/presentation/rewards_provider.dart';

class StubRewardsRepository implements RewardsRepository {
  @override
  dynamic apiClient;

  bool throwError = false;
  int balanceCents = 150;
  int pendingCents = 50;

  @override
  Future<RewardBalance> getBalance() async {
    if (throwError) throw Exception('API Error');
    return RewardBalance(balanceCents: balanceCents, pendingBalanceCents: pendingCents);
  }

  @override
  Future<PaginatedTransactions> getTransactions({int page = 1, int limit = 20}) async {
    if (throwError) throw Exception('API Error');
    return PaginatedTransactions(
      data: [
        RewardTransaction(
          id: 'tx-1',
          type: 'EARN',
          amountCents: 100,
          status: 'SETTLED',
          createdAt: DateTime(2026, 7, 23),
        ),
      ],
      page: 1,
      total: 1,
    );
  }

  @override
  Future<PackagingLookupResult> lookupPackaging(String externalQrHash) async {
    if (throwError) throw Exception('Not Found');
    return PackagingLookupResult(
      id: 'pkg-123',
      serial: 'SR-12345',
      status: 'COLLECTED',
      materialCode: 'PET',
      rewardCents: 10,
      unitCostCents: 20,
    );
  }

  @override
  Future<void> claimReward({
    required String userId,
    required String packagingId,
    required int amountCents,
    required String idempotencyKey,
  }) async {
    if (throwError) throw Exception('Claim Failed');
    balanceCents += amountCents;
  }

  @override
  Future<void> cashout(int amountCents) async {
    if (throwError) throw Exception('Cashout Failed');
    balanceCents -= amountCents;
  }
}

void main() {
  group('RewardsProvider Tests', () {
    late StubRewardsRepository stubRepo;
    late RewardsProvider provider;

    setUp(() {
      stubRepo = StubRewardsRepository();
      provider = RewardsProvider(repository: stubRepo);
    });

    test('Initial states are empty/zero', () {
      expect(provider.balanceCents, 0);
      expect(provider.pendingBalanceCents, 0);
      expect(provider.balanceEur, 0.0);
      expect(provider.transactions.isEmpty, true);
    });

    test('fetchDashboardData successfully loads data', () async {
      await provider.fetchDashboardData();

      expect(provider.isLoading, false);
      expect(provider.balanceCents, 150);
      expect(provider.pendingBalanceCents, 50);
      expect(provider.balanceEur, 1.50);
      expect(provider.pendingBalanceEur, 0.50);
      expect(provider.transactions.length, 1);
      expect(provider.transactions.first.id, 'tx-1');
    });

    test('fetchDashboardData records error message on failure', () async {
      stubRepo.throwError = true;

      await provider.fetchDashboardData();

      expect(provider.isLoading, false);
      expect(provider.errorMessage, contains('Falha ao carregar dados do painel'));
    });

    test('claimPackage successfully increases balance', () async {
      await provider.fetchDashboardData();
      expect(provider.balanceCents, 150);

      final pkg = await provider.lookupPackage('test-hash');
      expect(pkg, isNotNull);

      final claimed = await provider.claimPackage(pkg!);
      expect(claimed, true);
      expect(provider.balanceCents, 160); // 150 + 10 reward
    });

    test('processCashout reduces balance correctly', () async {
      await provider.fetchDashboardData();
      expect(provider.balanceCents, 150);

      final success = await provider.processCashout(100);
      expect(success, true);
      expect(provider.balanceCents, 50);
    });

    test('processCashout fails if amount exceeds balance', () async {
      await provider.fetchDashboardData();
      expect(provider.balanceCents, 150);

      final success = await provider.processCashout(200);
      expect(success, false);
      expect(provider.errorMessage, contains('Saldo insuficiente'));
      expect(provider.balanceCents, 150);
    });
  });
}

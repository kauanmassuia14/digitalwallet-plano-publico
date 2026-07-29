import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../data/rewards_repository.dart';
import '../../../core/storage/secure_storage.dart';

class RewardsProvider extends ChangeNotifier {
  final RewardsRepository _repository;
  final SecureStorage _secureStorage;

  RewardsProvider({
    RewardsRepository? repository,
    SecureStorage? secureStorage,
  })  : _repository = repository ?? RewardsRepository(),
        _secureStorage = secureStorage ?? SecureStorage();

  int _balanceCents = 0;
  int _pendingBalanceCents = 0;
  List<RewardTransaction> _transactions = [];
  bool _isLoading = false;
  String? _errorMessage;

  int get balanceCents => _balanceCents;
  int get pendingBalanceCents => _pendingBalanceCents;
  List<RewardTransaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  double get balanceEur => _balanceCents / 100.0;
  double get pendingBalanceEur => _pendingBalanceCents / 100.0;

  Future<void> fetchDashboardData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final bal = await _repository.getBalance();
      _balanceCents = bal.balanceCents;
      _pendingBalanceCents = bal.pendingBalanceCents;

      final history = await _repository.getTransactions(page: 1, limit: 20);
      _transactions = history.data;
    } catch (e) {
      _errorMessage = 'Falha ao carregar dados do painel: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<PackagingLookupResult?> lookupPackage(String hash) async {
    _errorMessage = null;
    notifyListeners();

    try {
      return await _repository.lookupPackaging(hash);
    } catch (e) {
      _errorMessage = 'Falha ao buscar embalagem: ${e.toString()}';
      notifyListeners();
      return null;
    }
  }

  Future<bool> claimPackage(PackagingLookupResult package) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final userId = await _secureStorage.getAccessToken() ?? 'b2a647d9-291a-4d2c-80a9-17382dcf1a1e';
      final idempotencyKey = const Uuid().v4();

      await _repository.claimReward(
        userId: userId,
        packagingId: package.id,
        amountCents: package.rewardCents,
        idempotencyKey: idempotencyKey,
      );

      // Refresh data after successful claim
      await fetchDashboardData();
      return true;
    } catch (e) {
      _errorMessage = 'Falha ao resgatar recompensa: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> processCashout(int amountCents) async {
    if (amountCents <= 0 || amountCents > _balanceCents) {
      _errorMessage = 'Saldo insuficiente ou valor inválido para cashout.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.cashout(amountCents);
      // Refresh data
      await fetchDashboardData();
      return true;
    } catch (e) {
      _errorMessage = 'Falha ao processar saque: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

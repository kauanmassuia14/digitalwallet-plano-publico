import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';

class PackagingLookupResult {
  final String id;
  final String serial;
  final String status;
  final String materialCode;
  final int rewardCents;
  final int unitCostCents;

  PackagingLookupResult({
    required this.id,
    required this.serial,
    required this.status,
    required this.materialCode,
    required this.rewardCents,
    required this.unitCostCents,
  });

  factory PackagingLookupResult.fromJson(Map<String, dynamic> json) {
    return PackagingLookupResult(
      id: json['id'] as String,
      serial: json['serial'] as String,
      status: json['status'] as String,
      materialCode: json['materialCode'] as String,
      rewardCents: json['rewardCents'] as int,
      unitCostCents: json['unitCostCents'] as int,
    );
  }
}

class RewardBalance {
  final int balanceCents;
  final int pendingBalanceCents;

  RewardBalance({required this.balanceCents, required this.pendingBalanceCents});

  factory RewardBalance.fromJson(Map<String, dynamic> json) {
    return RewardBalance(
      balanceCents: json['balanceCents'] as int,
      pendingBalanceCents: json['pendingBalanceCents'] as int,
    );
  }
}

class RewardTransaction {
  final String id;
  final String type;
  final int amountCents;
  final String status;
  final DateTime createdAt;

  RewardTransaction({
    required this.id,
    required this.type,
    required this.amountCents,
    required this.status,
    required this.createdAt,
  });

  factory RewardTransaction.fromJson(Map<String, dynamic> json) {
    return RewardTransaction(
      id: json['id'] as String,
      type: json['type'] as String,
      amountCents: json['amountCents'] as int,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class PaginatedTransactions {
  final List<RewardTransaction> data;
  final int page;
  final int total;

  PaginatedTransactions({required this.data, required this.page, required this.total});
}

class RewardsRepository {
  final ApiClient apiClient;

  RewardsRepository({ApiClient? apiClient})
      : apiClient = apiClient ??
            ApiClient(
              secureStorage: SecureStorage(),
              baseUrl: 'https://106e4a895c8c75.lhr.life/api',
            );

  Future<RewardBalance> getBalance() async {
    final res = await apiClient.dio.get<Map<String, dynamic>>('/v1/rewards/balance');
    return RewardBalance.fromJson(res.data!);
  }

  Future<PaginatedTransactions> getTransactions({int page = 1, int limit = 20}) async {
    final res = await apiClient.dio.get<Map<String, dynamic>>(
      '/v1/rewards/transactions',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = res.data!;
    final list = (data['data'] as List<dynamic>)
        .map((x) => RewardTransaction.fromJson(x as Map<String, dynamic>))
        .toList();
    final meta = data['meta'] as Map<String, dynamic>;
    return PaginatedTransactions(
      data: list,
      page: meta['page'] as int,
      total: meta['total'] as int,
    );
  }

  Future<PackagingLookupResult> lookupPackaging(String externalQrHash) async {
    final res = await apiClient.dio.get<Map<String, dynamic>>(
      '/v1/packaging/public/lookup/$externalQrHash',
    );
    return PackagingLookupResult.fromJson(res.data!);
  }

  Future<void> claimReward({
    required String userId,
    required String packagingId,
    required int amountCents,
    required String idempotencyKey,
  }) async {
    await apiClient.dio.post<void>(
      '/v1/rewards/earn',
      data: {
        'userId': userId,
        'packagingId': packagingId,
        'amountCents': amountCents,
        'idempotencyKey': idempotencyKey,
      },
    );
  }

  Future<void> cashout(int amountCents) async {
    await apiClient.dio.post<void>(
      '/v1/rewards/cashout',
      data: {'amountCents': amountCents},
    );
  }
}

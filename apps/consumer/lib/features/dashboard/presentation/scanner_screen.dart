import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'rewards_provider.dart';
import '../data/rewards_repository.dart';

class ScannerScreen extends StatefulWidget {
  final RewardsProvider provider;

  const ScannerScreen({super.key, required this.provider});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  final TextEditingController _mockInputController = TextEditingController();
  bool _isCameraMode = true;
  bool _isLoading = false;
  PackagingLookupResult? _lookedUpPackage;
  String? _statusMessage;

  @override
  void dispose() {
    _scannerController.dispose();
    _mockInputController.dispose();
    super.dispose();
  }

  Future<void> _handleCodeDetected(String code) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _statusMessage = null;
      _lookedUpPackage = null;
    });

    final pkg = await widget.provider.lookupPackage(code);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (pkg != null) {
          _lookedUpPackage = pkg;
        } else {
          _statusMessage = 'Embalagem não encontrada no sistema.';
        }
      });
    }
  }

  Future<void> _claimReward() async {
    final pkg = _lookedUpPackage;
    if (pkg == null) return;

    setState(() {
      _isLoading = true;
    });

    final success = await widget.provider.claimPackage(pkg);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recompensa resgatada com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.provider.errorMessage ?? 'Erro ao resgatar recompensa.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Escanear QR Code'),
        actions: [
          IconButton(
            icon: Icon(_isCameraMode ? Icons.edit : Icons.camera_alt),
            tooltip: _isCameraMode ? 'Digitar Código' : 'Usar Câmera',
            onPressed: () {
              setState(() {
                _isCameraMode = !_isCameraMode;
                _lookedUpPackage = null;
                _statusMessage = null;
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 4,
              child: _isCameraMode
                  ? Stack(
                      children: [
                        MobileScanner(
                          controller: _scannerController,
                          onDetect: (capture) {
                            final List<Barcode> barcodes = capture.barcodes;
                            if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
                              _handleCodeDetected(barcodes.first.rawValue!);
                            }
                          },
                        ),
                        Container(
                          decoration: ShapeDecoration(
                            shape: QrScannerOverlayShape(
                              borderColor: theme.colorScheme.primary,
                              borderRadius: 10,
                              borderLength: 30,
                              borderWidth: 10,
                              cutOutSize: 250,
                            ),
                          ),
                        ),
                      ],
                    )
                  : Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.qr_code, size: 80, color: Colors.grey),
                          const SizedBox(height: 16),
                          Text(
                            'Simulação de Leitura (Desenvolvimento)',
                            style: theme.textTheme.titleMedium,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Insira o hash do QR Code externo da embalagem (ex: ext-hash-SR-...)',
                            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          TextField(
                            controller: _mockInputController,
                            decoration: const InputDecoration(
                              labelText: 'Código do QR Code',
                              border: OutlineInputBorder(),
                              hintText: 'ext-hash-SR-...',
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: _isLoading
                                ? null
                                : () => _handleCodeDetected(_mockInputController.text.trim()),
                            icon: const Icon(Icons.search),
                            label: const Text('Verificar Código'),
                          ),
                        ],
                      ),
                    ),
            ),
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  border: Border(top: BorderSide(color: theme.dividerColor)),
                ),
                child: _buildDetailsArea(theme),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsArea(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_statusMessage != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 16),
          Text(
            _statusMessage!,
            style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    final pkg = _lookedUpPackage;
    if (pkg == null) {
      return Center(
        child: Text(
          _isCameraMode ? 'Aponte a câmera para o QR Code da embalagem' : 'Insira um código e clique em verificar',
          style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey),
          textAlign: TextAlign.center,
        ),
      );
    }

    final canClaim = pkg.status.toUpperCase() == 'COLLECTED';
    final claimExplanation = _getClaimExplanation(pkg.status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.between,
          children: [
            Text('Embalagem Detectada', style: theme.textTheme.titleMedium),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: canClaim ? Colors.green.shade50 : Colors.orange.shade50,
                border: Border.all(color: canClaim ? Colors.green : Colors.orange),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                pkg.status,
                style: TextStyle(
                  color: canClaim ? Colors.green.shade800 : Colors.orange.shade800,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            _buildDetailTile(theme, 'Material', pkg.materialCode),
            const SizedBox(width: 16),
            _buildDetailTile(theme, 'Recompensa', '€ ${(pkg.rewardCents / 100).toStringAsFixed(2)}'),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Serial: ${pkg.serial}',
          style: theme.textTheme.bodyMedium?.copyWith(fontFamily: 'monospace', color: Colors.grey.shade600),
        ),
        const Spacer(),
        if (canClaim)
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.green.shade600,
              foregroundColor: Colors.white,
            ),
            onPressed: _claimReward,
            icon: const Icon(Icons.check_circle),
            label: const Text('Reivindicar Recompensa'),
          )
        else
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Text(
              claimExplanation,
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }

  Widget _buildDetailTile(ThemeData theme, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: theme.dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
            const SizedBox(height: 4),
            Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  String _getClaimExplanation(String status) {
    switch (status.toUpperCase()) {
      case 'MINTED':
      case 'IN_CIRCULATION':
        return 'Esta embalagem ainda não foi depositada em um ecoponto/cooperativa. Retorne a embalagem ao ecoponto para liberar o resgate.';
      case 'RECYCLED':
        return 'Esta recompensa já foi resgatada e a embalagem já foi enviada para reciclagem.';
      default:
        return 'Esta embalagem não está elegível para resgate de recompensa.';
    }
  }
}

// Simple Custom Qr overlay painter similar to packages
class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderRadius;
  final double borderWidth;
  final double borderLength;
  final double cutOutSize;

  const QrScannerOverlayShape({
    this.borderColor = Colors.white,
    this.borderRadius = 0,
    this.borderWidth = 1,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => Path();

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return Path()..addRect(rect);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final height = rect.height;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    final backgroundPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    final cutOutRect = Rect.fromLTWH(
      rect.left + (width - cutOutSize) / 2,
      rect.top + (height - cutOutSize) / 2,
      cutOutSize,
      cutOutSize,
    );

    // Draw background with cut out hole
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(rect),
        Path()..addRRect(RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius))),
      ),
      backgroundPaint,
    );

    // Draw borders
    final borderPath = Path();
    final left = cutOutRect.left;
    final top = cutOutRect.top;
    final right = cutOutRect.right;
    final bottom = cutOutRect.bottom;

    // Top left
    borderPath.moveTo(left, top + borderLength);
    borderPath.lineTo(left, top);
    borderPath.lineTo(left + borderLength, top);

    // Top right
    borderPath.moveTo(right - borderLength, top);
    borderPath.lineTo(right, top);
    borderPath.lineTo(right, top + borderLength);

    // Bottom right
    borderPath.moveTo(right, bottom - borderLength);
    borderPath.lineTo(right, bottom);
    borderPath.lineTo(right - borderLength, bottom);

    // Bottom left
    borderPath.moveTo(left + borderLength, bottom);
    borderPath.lineTo(left, bottom);
    borderPath.lineTo(left, bottom - borderLength);

    canvas.drawPath(borderPath, borderPaint);
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderRadius: borderRadius * t,
      borderWidth: borderWidth * t,
      borderLength: borderLength * t,
      cutOutSize: cutOutSize * t,
    );
  }
}

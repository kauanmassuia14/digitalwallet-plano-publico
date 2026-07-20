# Contrato de entrada de embalagens v1

O mesmo contrato lógico alimenta importação e cadastro manual. O canal pode mudar;
normalização, validação e idempotência não mudam.

## Campos

| Campo              | Tipo       | Regra                                                         |
| ------------------ | ---------- | ------------------------------------------------------------- |
| `batch_code`       | string     | 1–64 caracteres; único por tenant                             |
| `serial`           | string     | 1–128 caracteres; único por tenant; preserva zeros à esquerda |
| `material_code`    | string     | enum/versionado pelo catálogo do tenant                       |
| `weight_grams`     | decimal    | maior que zero; no máximo 2 casas                             |
| `unit_cost_cents`  | integer    | zero ou positivo; moeda definida no lote                      |
| `reward_cents`     | integer    | zero ou positivo; moeda definida no lote                      |
| `external_qr_hash` | hex string | SHA-256 normalizado, 64 caracteres, único globalmente         |
| `internal_qr_hash` | hex string | SHA-256 normalizado, 64 caracteres, único globalmente         |

## Envelope de importação

```json
{
  "contract_version": "packaging-import.v1",
  "source_event_id": "client-generated-idempotency-key",
  "tenant_reference": "resolved-server-side",
  "batch": {
    "code": "ES-MAD-2026-001",
    "country_code": "ES",
    "currency": "EUR"
  },
  "items": []
}
```

`tenant_reference` nunca autoriza acesso: o tenant efetivo vem do principal
autenticado. O valor do payload serve apenas para detectar divergência.

## Rejeição e confirmação

- O parse preserva arquivo original, hash, autor, horário e versão do contrato.
- A prévia não persiste embalagens; apenas o job e o relatório de validação.
- Cada linha retorna código estável, campo e mensagem localizada.
- A confirmação recebe idempotency key e a lista explícita de linhas aceitas.
- Repetir a mesma confirmação retorna o mesmo resultado.
- Reutilizar a chave com payload diferente responde conflito.

## Códigos de erro iniciais

- `IMPORT_COLUMN_MISSING`
- `IMPORT_VALUE_INVALID`
- `IMPORT_SERIAL_DUPLICATE_FILE`
- `PACKAGING_SERIAL_ALREADY_EXISTS`
- `QR_HASH_ALREADY_EXISTS`
- `IMPORT_CONTRACT_UNSUPPORTED`
- `IDEMPOTENCY_PAYLOAD_MISMATCH`

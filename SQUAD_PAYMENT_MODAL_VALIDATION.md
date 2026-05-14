# Squad Payment Modal Integration — Validation Report

**Date:** 2026-05-14  
**Status:** ✅ **FIXED** — Implementation now matches Squad documentation

---

## Documentation Source
[Squad Payment Modal Documentation](https://squadco.com/docs)

---

## Validation Results

### ✅ **Required Parameters (All Implemented)**

| Parameter | Required | Our Implementation | Status |
|-----------|----------|-------------------|--------|
| `key` | Yes | `settings.SQUAD_PUBLIC_KEY` passed in payload | ✅ FIXED |
| `email` | Yes | Passed from customer email | ✅ OK |
| `amount` | Yes | Passed as `amount_kobo` (in lowest unit) | ✅ OK |
| `currency_code` | Yes | Passed as `currency_code: "NGN"` | ✅ FIXED |
| `transaction_ref` | No | Generated via `squad_client.build_collection_ref()` | ✅ OK |
| `callback_url` | No | Passed from treasury top-up request | ✅ OK |

### ✅ **Optional Parameters (All Supported)**

| Parameter | Our Implementation | Status |
|-----------|-------------------|--------|
| `payment_channels` | Array of channels (card, bank, ussd, transfer) | ✅ OK |
| `customer_name` | Passed if provided | ✅ OK |
| `pass_charge` | Boolean (default False) | ✅ OK |
| `metadata` | Custom object for tracking | ✅ OK |
| `initiate_type` | Set to `"inline"` for modal | ✅ FIXED |

---

## Changes Made

### 1. **app/config.py**
```python
SQUAD_PUBLIC_KEY: str = ""  # Public key for Payment Modal (key parameter)
```

### 2. **app/services/squad_client.py** — `initiate_payment()` method
```python
payload: dict[str, Any] = {
    "key": settings.SQUAD_PUBLIC_KEY,           # ← ADDED (required)
    "email": email,
    "amount": amount_kobo,
    "transaction_ref": tx_ref,
    "currency_code": currency,                   # ← CHANGED from "currency"
    "callback_url": callback_url,
    "pass_charge": pass_charge,
    "initiate_type": "inline",                   # ← ADDED
}
```

### 3. **backend/.env**
```
SQUAD_PUBLIC_KEY=test_pk_your_sandbox_public_key_here
```
**Action Required:** User must replace with actual public key from Squad dashboard.

---

## Endpoint: `POST /api/v1/treasury/topups/initiate`

**Flow:**
1. Frontend → Backend: POST amount, email, payment_channels, etc.
2. Backend → Squad: POST `/transaction/initiate` with all required parameters
3. Squad → Backend: Returns `checkout_url` (Payment Modal link)
4. Backend → Frontend: Returns `checkout_url`
5. Frontend: Redirects user to `checkout_url` → Squad Payment Modal opens
6. User: Completes payment in modal
7. Squad → Backend: Redirect to `/api/v1/treasury/topups/{topup_id}/redirect` OR webhook

**Full Request Example:**
```bash
curl -X POST https://your-backend/api/v1/treasury/topups/initiate \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "email": "user@example.com",
    "customerName": "John Doe",
    "paymentChannels": ["card", "transfer", "ussd"],
    "metadata": {"purpose": "payroll_funding"}
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "amount": 50000,
  "currency": "NGN",
  "checkoutUrl": "https://checkout.squad.live/...",
  "transactionRef": "GHOSTGUARD_TOPUP_abc123def",
  "customerEmail": "user@example.com",
  "createdAt": "2026-05-14T10:30:00Z",
  ...
}
```

---

## Webhook Handling

**Endpoint:** `POST /api/v1/webhooks/squad` (no JWT required)

Webhook signature verification supports:
- ✅ V1: Full-body SHA512 hash
- ✅ V2/V3: Field-specific hash (fallback)

Transaction status normalized to: `success | pending | failed | abandoned | unknown`

---

## Testing Checklist

- [ ] Obtain actual `SQUAD_PUBLIC_KEY` from Squad sandbox dashboard
- [ ] Update `.env` with real public key
- [ ] Test checkout flow: `POST /api/v1/treasury/topups/initiate`
- [ ] Verify `checkout_url` is returned
- [ ] Open `checkout_url` in browser → Squad Payment Modal should display
- [ ] Test all payment channels: card, transfer, ussd
- [ ] Complete a test payment
- [ ] Verify webhook received at `/api/v1/webhooks/squad`
- [ ] Verify top-up status updated to `success`
- [ ] Verify wallet balance reflected in `GET /api/v1/treasury/wallet`

---

## Notes

- **Currency:** Currently hardcoded to "NGN". Can be made dynamic if USD support needed.
- **Public Key:** The public key (`test_pk_*` or `live_pk_*`) is different from the API secret key.
  - Public key: Used in Payment Modal parameters
  - Secret key: Used for API authentication and webhook verification
- **Parameter Names:** Implementation follows Squad's parameter table, not curl example (some inconsistency in their docs).


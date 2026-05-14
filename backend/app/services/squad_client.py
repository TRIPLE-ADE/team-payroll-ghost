import uuid
from typing import Any

import httpx

from app.config import settings


class SquadClient:
    def __init__(self):
        self.base = settings.SQUAD_BASE_URL.rstrip("/")
        self.merchant_id = settings.SQUAD_MERCHANT_ID
        self.headers = {
            "Authorization": settings.SQUAD_API_KEY,
            "Content-Type": "application/json",
        }

    @staticmethod
    def normalize_transfer_status(value: str | None) -> str:
        text = (value or "").strip().lower()
        if text in {"success", "successful", "completed", "approved"}:
            return "success"
        if text in {"pending", "processing"}:
            return "pending"
        if text in {"failed", "failure", "reversed", "reverse", "declined"}:
            return "failed"
        return "unknown"

    @staticmethod
    def normalize_collection_status(value: str | None) -> str:
        text = (value or "").strip().lower()
        if text in {"success", "successful", "completed", "approved"}:
            return "success"
        if text in {"pending", "processing", "initiated"}:
            return "pending"
        if text in {"abandoned", "cancelled", "canceled"}:
            return "abandoned"
        if text in {"failed", "failure", "declined", "expired"}:
            return "failed"
        return "unknown"

    async def create_virtual_account(
        self,
        emp_id: str,
        first_name: str,
        last_name: str,
        bvn: str,
        dob: str,
        gender: str,
        mobile_num: str,
        address: str,
        email: str | None = None,
        middle_name: str | None = None,
        beneficiary_account: str | None = None,
        customer_identifier: str | None = None,
    ) -> dict:
        """
        POST /virtual-account
        Creates a virtual account and triggers Squad's BVN validation flow.
        """
        payload = {
            "customer_identifier": customer_identifier or f"GBUSTER_{emp_id}_{uuid.uuid4().hex[:8]}",
            "first_name": first_name,
            "last_name": last_name,
            "mobile_num": mobile_num,
            "email": email or f"{emp_id}@ghostguard.io",
            "bvn": bvn,
            "dob": dob,
            "gender": gender,
            "address": address,
        }
        if middle_name:
            payload["middle_name"] = middle_name
        if beneficiary_account:
            payload["beneficiary_account"] = beneficiary_account
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.base}/virtual-account",
                    json=payload,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json()
                return {"status": "BVN_VALID", "reason": data.get("message", "Success"), "data": data.get("data", data)}
        except httpx.HTTPStatusError as e:
            try:
                error_body = e.response.json()
            except Exception:
                error_body = {}
            reason = error_body.get("message") or str(e)
            status = "VALIDATION_FAILED" if e.response.status_code in (400, 401) else "ERROR"
            return {"status": status, "reason": reason, "data": error_body}

    async def validate_bvn(
        self,
        emp_id: str,
        first_name: str,
        last_name: str,
        bvn: str,
        dob: str,
        gender: str,
        mobile_num: str,
        address: str,
        email: str | None = None,
        middle_name: str | None = None,
        beneficiary_account: str | None = None,
        customer_identifier: str | None = None,
    ) -> dict:
        return await self.create_virtual_account(
            emp_id=emp_id,
            first_name=first_name,
            last_name=last_name,
            bvn=bvn,
            dob=dob,
            gender=gender,
            mobile_num=mobile_num,
            address=address,
            email=email,
            middle_name=middle_name,
            beneficiary_account=beneficiary_account,
            customer_identifier=customer_identifier,
        )

    async def lookup_account(self, account_number: str, bank_code: str) -> dict:
        """POST /payout/account/lookup — verify account name before transfer."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/payout/account/lookup",
                json={"account_number": account_number, "bank_code": bank_code},
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def transfer(
        self,
        account_number: str,
        bank_code: str,
        account_name: str,
        amount_kobo: int,
        tx_ref: str,
        remark: str,
    ) -> dict:
        """
        POST /payout/transfer
        amount_kobo: salary in kobo (naira × 100)
        account_name: REQUIRED by Squad (verified from account lookup)
        tx_ref: MUST include MERCHANT_ID per Squad spec
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/payout/transfer",
                json={
                    "account_number": account_number,
                    "bank_code": bank_code,
                    "account_name": account_name,  # REQUIRED
                    "currency_id": "NGN",
                    "amount": amount_kobo,
                    "transaction_reference": tx_ref,  # Must include merchant ID
                    "remark": remark,
                },
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def requery(self, tx_ref: str) -> dict:
        """POST /payout/requery — check transfer status."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/payout/requery",
                json={"transaction_reference": tx_ref},
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def list_transfers(self, page: int = 1, per_page: int = 10, direction: str = "DESC") -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base}/payout/list",
                params={"page": page, "perPage": per_page, "dir": direction},
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def initiate_payment(
        self,
        email: str,
        amount_kobo: int,
        tx_ref: str,
        callback_url: str,
        customer_name: str | None = None,
        payment_channels: list[str] | None = None,
        pass_charge: bool = False,
        metadata: dict[str, Any] | None = None,
        currency: str = "NGN",
    ) -> dict:
        # Note: Squad's docs show "key" and "CallBack_URL" in the curl example,
        # but the actual API rejects both. The API authenticates via the
        # Authorization header (secret key) — the public "key" is for the JS
        # widget only — and the callback param must be lowercase "callback_url".
        payload: dict[str, Any] = {
            "amount": amount_kobo,
            "email": email,
            "currency": currency,
            "initiate_type": "inline",
            "callback_url": callback_url,
        }
        if customer_name:
            payload["customer_name"] = customer_name
        if payment_channels:
            payload["payment_channels"] = payment_channels
        if pass_charge:
            payload["pass_charge"] = pass_charge
        if metadata:
            payload["metadata"] = metadata

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/transaction/initiate",
                json=payload,
                headers=self.headers,
            )
            if not resp.is_success:
                error_text = resp.text
                try:
                    error_body = resp.json()
                except Exception:
                    error_body = {"raw_response": error_text}
                raise ValueError(f"Squad API error {resp.status_code}: {error_body}")
            return resp.json()

    async def simulate_virtual_account_payment(self, virtual_account_number: str, amount_kobo: int) -> dict:
        """
        POST /virtual-account/simulate/payment
        Sandbox helper for transfer-channel checkout funding.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/virtual-account/simulate/payment",
                json={
                    "virtual_account_number": virtual_account_number,
                    "amount": amount_kobo,
                },
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_wallet_balance(self, currency_id: str = "NGN") -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base}/merchant/balance",
                params={"currency_id": currency_id},
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_merchant_virtual_accounts(
        self,
        page: int = 1,
        per_page: int = 10,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict:
        params: dict[str, str | int] = {"page": page, "perPage": per_page}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["EndDate"] = end_date

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base}/virtual-account/merchant/accounts",
                params=params,
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def verify_transaction(self, tx_ref: str) -> dict:
        """GET /transaction/verify/:ref"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base}/transaction/verify/{tx_ref}",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    def build_tx_ref(self, emp_id: str) -> str:
        """
        Generate unique transaction reference with merchant ID.
        Format: {MERCHANT_ID}_{emp_id}_{random_suffix}
        IMPORTANT: Squad requires merchant ID in the reference.
        """
        return f"{self.merchant_id}_{emp_id}_{uuid.uuid4().hex[:8]}"

    def build_collection_ref(self, tag: str = "TOPUP") -> str:
        return f"{self.merchant_id}_{tag}_{uuid.uuid4().hex[:10]}"


squad_client = SquadClient()

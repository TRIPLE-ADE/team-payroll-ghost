import uuid

import httpx

from app.config import settings


class SquadClient:
    def __init__(self):
        self.base = settings.SQUAD_BASE_URL.rstrip("/")
        self.merchant_id = settings.SQUAD_MERCHANT_ID
        self.headers = {
            "Authorization": f"Bearer {settings.SQUAD_API_KEY}",
            "Content-Type": "application/json",
        }

    async def create_virtual_account(
        self,
        emp_id: str,
        first_name: str,
        last_name: str,
        bvn: str,
        dob: str,
        gender: str,
    ) -> dict:
        """
        POST /virtual-account
        Creates virtual account and validates BVN internally.
        Returns { "status": "BVN_VALID", "account_name": "...", ... }
        or { "status": "BVN_MISMATCH", "reason": "..." } on 400.
        """
        payload = {
            "customer_identifier": f"GBUSTER_{emp_id}",
            "first_name": first_name,
            "last_name": last_name,
            "mobile_num": "",
            "email": f"{emp_id}@ghostbuster.io",
            "bvn": bvn,
            "dob": dob,
            "gender": gender,
            "currency": "NGN",
            "is_permanent": False,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.base}/virtual-account",
                    json=payload,
                    headers=self.headers,
                )
                if resp.status_code == 400:
                    data = resp.json()
                    return {"status": "BVN_MISMATCH", "reason": data.get("message", "BVN validation failed")}
                resp.raise_for_status()
                data = resp.json()
                # Extract account_name from Squad response (varies by API version)
                account_name = data.get("account_name") or f"{first_name} {last_name}"
                return {"status": "BVN_VALID", "account_name": account_name, "data": data}
        except httpx.HTTPStatusError as e:
            return {"status": "BVN_MISMATCH", "reason": str(e)}

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
        narration: str,
    ) -> dict:
        """
        POST /payout/transfer
        amount_kobo: salary in kobo (naira × 100)
        account_name: REQUIRED by Squad (verified from virtual account/lookup)
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
                    "narration": narration,
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


squad_client = SquadClient()

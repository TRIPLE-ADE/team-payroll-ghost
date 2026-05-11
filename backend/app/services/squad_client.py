import time

import httpx

from app.config import settings


class SquadClient:
    def __init__(self):
        self.base = settings.SQUAD_BASE_URL.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {settings.SQUAD_API_KEY}",
            "Content-Type": "application/json",
        }

    async def validate_bvn(
        self,
        emp_id: str,
        first_name: str,
        last_name: str,
        bvn: str,
        dob: str,
        gender: str,
    ) -> dict:
        """
        POST /virtual-account — Squad 400 = BVN mismatch = identity unverified.
        Returns { "status": "BVN_VALID" } or { "status": "BVN_MISMATCH", "reason": "..." }.
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
                return {"status": "BVN_VALID", "data": resp.json()}
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
        amount_kobo: int,
        tx_ref: str,
        narration: str,
    ) -> dict:
        """POST /payout/transfer — amount in kobo (naira × 100)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/payout/transfer",
                json={
                    "account_number": account_number,
                    "bank_code": bank_code,
                    "currency_id": "NGN",
                    "amount": amount_kobo,
                    "transaction_reference": tx_ref,
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
        return f"GBUSTER_{emp_id}_{int(time.time())}"


squad_client = SquadClient()

import httpx

from app.config import settings


class MLClient:
    def __init__(self):
        self.base = settings.ML_SERVICE_URL.rstrip("/")

    async def analyze_batch(self, csv_bytes: bytes, filename: str = "payroll.csv") -> dict:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base}/api/v1/analyze/batch",
                files={"file": (filename, csv_bytes, "text/csv")},
            )
            resp.raise_for_status()
            return resp.json()

    async def detect_duplicates(self, csv_bytes: bytes, filename: str = "payroll.csv") -> dict:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base}/api/v1/detect/duplicates",
                files={"file": (filename, csv_bytes, "text/csv")},
            )
            resp.raise_for_status()
            return resp.json()

    async def analyze_single(self, employee: dict) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base}/api/v1/analyze/employee",
                json=employee,
            )
            resp.raise_for_status()
            return resp.json()

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base}/health")
                return resp.status_code == 200
        except Exception:
            return False


ml_client = MLClient()

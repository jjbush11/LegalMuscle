import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from immudb import ImmudbClient
from immudb.exceptions import ImmudbError

logger = logging.getLogger(__name__)


class ImmudbService:
    def __init__(self, host: str = "immudb", port: int = 3322, database: str = "defaultdb"):
        self.host = host
        self.port = port
        self.database = database
        self._client: Optional[ImmudbClient] = None

    def _get_client(self) -> ImmudbClient:
        """Get or create immudb client connection"""
        if self._client is None:
            try:
                self._client = ImmudbClient(f"{self.host}:{self.port}")
                self._client.login("immudb", "immudb")  # default credentials
                self._client.useDatabase(self.database.encode())
                logger.info(f"Connected to immudb at {self.host}:{self.port}")
            except ImmudbError as e:
                logger.error(f"Failed to connect to immudb: {e}")
                raise
        return self._client

    async def write_evidence_transaction(
        self,
        object_id: UUID,
        sha256: str,
        minio_version_id: str,
        timestamp: datetime,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Write evidence transaction to immudb ledger
        Returns the transaction ID
        """
        try:
            client = self._get_client()
            
            # Prepare transaction data
            tx_data = {
                "object_id": str(object_id),
                "sha256": sha256,
                "minio_version_id": minio_version_id,
                "timestamp": timestamp.isoformat(),
                "type": "evidence_upload"
            }
            
            if additional_data:
                tx_data.update(additional_data)
            
            # Create key for this evidence object
            key = f"evidence:{object_id}"
            value = json.dumps(tx_data)
            
            # Write to immudb
            result = client.set(key.encode(), value.encode())
            tx_id = str(result.id)
            
            logger.info(f"Written evidence transaction to immudb: {tx_id}")
            return tx_id
            
        except ImmudbError as e:
            logger.error(f"Failed to write to immudb: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error writing to immudb: {e}")
            raise

    async def verify_transaction(self, key: str) -> Optional[Dict[str, Any]]:
        """Verify a transaction exists and return its data"""
        try:
            client = self._get_client()
            result = client.get(key.encode())
            if result:
                return json.loads(result.value.decode())
            return None
        except ImmudbError as e:
            logger.error(f"Failed to verify transaction: {e}")
            return None

    def close(self):
        """Close the immudb connection"""
        if self._client:
            try:
                self._client.logout()
                self._client = None
            except Exception as e:
                logger.error(f"Error closing immudb connection: {e}")


# Global instance
immudb_service = ImmudbService()

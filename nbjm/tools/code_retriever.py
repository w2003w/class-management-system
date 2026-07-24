import httpx
import json
import os
import time
from typing import List, Dict, Any, Optional


class CodeRetriever:
    def __init__(self, base_url: str = "http://localhost:8901"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search_code(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/api/v1/invoke",
                json={
                    "tool": "search_code",
                    "arguments": {
                        "query": query,
                        "limit": limit
                    }
                }
            )
            if response.status_code == 200:
                result = response.json()
                return result.get("results", [])
        except Exception as e:
            print(f"[CodeRetriever] search_code failed: {e}")
        return []

    async def get_symbol_definition(self, symbol_name: str) -> Optional[Dict[str, Any]]:
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/api/v1/invoke",
                json={
                    "tool": "get_symbol_definition",
                    "arguments": {
                        "symbol_name": symbol_name
                    }
                }
            )
            if response.status_code == 200:
                return response.json().get("result")
        except Exception as e:
            print(f"[CodeRetriever] get_symbol_definition failed: {e}")
        return None

    async def get_repo_structure(self) -> Optional[Dict[str, Any]]:
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/api/v1/invoke",
                json={
                    "tool": "list_files",
                    "arguments": {}
                }
            )
            if response.status_code == 200:
                return response.json().get("result")
        except Exception as e:
            print(f"[CodeRetriever] get_repo_structure failed: {e}")
        return None

    async def search_similar_patterns(self, code_snippet: str, limit: int = 5) -> List[Dict[str, Any]]:
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/api/v1/invoke",
                json={
                    "tool": "search_similar_code",
                    "arguments": {
                        "code": code_snippet,
                        "limit": limit
                    }
                }
            )
            if response.status_code == 200:
                result = response.json()
                return result.get("results", [])
        except Exception as e:
            print(f"[CodeRetriever] search_similar_patterns failed: {e}")
        return []

    async def get_related_symbols(self, symbol_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/api/v1/invoke",
                json={
                    "tool": "get_related_symbols",
                    "arguments": {
                        "symbol_name": symbol_name,
                        "limit": limit
                    }
                }
            )
            if response.status_code == 200:
                result = response.json()
                return result.get("results", [])
        except Exception as e:
            print(f"[CodeRetriever] get_related_symbols failed: {e}")
        return []

    async def health_check(self) -> bool:
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        await self.client.aclose()

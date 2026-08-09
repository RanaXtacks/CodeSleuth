import os
import re
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

async def fetch_pr_diff(pr_url: str) -> Optional[str]:
    """
    Parses a GitHub PR URL and fetches the raw diff via the GitHub API.
    Handles unauthenticated and PAT authenticated requests with redirect support.
    """
    if not pr_url or not pr_url.strip():
        raise ValueError("GitHub PR URL is required.")

    pr_url = pr_url.strip()
    
    # Example URL: https://github.com/owner/repo/pull/123
    match = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url)
    if not match:
        raise ValueError("Invalid GitHub PR URL format. Expected: https://github.com/owner/repo/pull/123")
    
    owner, repo, pr_number = match.groups()
    api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    
    headers = {
        "Accept": "application/vnd.github.v3.diff",
        "User-Agent": "CodeSleuth-App"
    }
    
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PAT")
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"
        
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(api_url, headers=headers, timeout=15.0)
        
        if response.status_code == 403 and "rate limit" in response.text.lower():
            raise Exception("GitHub API rate limit exceeded. Please configure GITHUB_TOKEN in your backend .env file.")
        elif response.status_code == 404:
            raise Exception(f"PR #{pr_number} in {owner}/{repo} not found. If private, ensure GITHUB_TOKEN has repo access.")
        elif response.status_code != 200:
            raise Exception(f"GitHub API returned HTTP {response.status_code}: {response.text}")
            
        diff_text = response.text
        if not diff_text or not diff_text.strip():
            raise Exception(f"PR #{pr_number} contains no diff changes or files.")

        return diff_text

def normalize_diff(payload: Dict[str, Any]) -> str:
    """
    Normalizes the incoming payload (raw_diff vs github_pr) into a single diff string.
    This aligns with Member C's DiffPayload contract.
    """
    # We return the diff_text string to be used by the rest of the pipeline
    if payload.get("source_type") == "github_pr":
        # Note: fetching must be done async before calling this if we want it blocking, 
        # but normally we'd fetch async in the route handler. 
        # We'll just return a flag indicating it needs fetching in the route.
        pass
        
    return payload.get("diff_text", "")

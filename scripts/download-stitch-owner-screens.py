#!/usr/bin/env python3
"""Download FitOra Academy Management (owner) Stitch screens (HTML + screenshots)."""

from __future__ import annotations

import json
import os
import re
import urllib.request
from typing import Any

API_KEY = os.environ.get("STITCH_API_KEY")
if not API_KEY:
    raise SystemExit("STITCH_API_KEY is required")

PROJECT = "7326153259200245460"
OUT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "docs", "stitch", "fitora-academy-management-app")
)
os.makedirs(OUT, exist_ok=True)

SCREENS = [
    ("asset-stub-assets_271b013a2be8490b9a15186d514425fa", "design-system", "Design System"),
    ("24f087d55e18418f8ce47153927301c6", "owner-login", "Owner Login"),
    ("73f3cba098a743f69f2072b4faf61102", "welcome-to-fitora-owner", "Welcome to FitOra Owner"),
    ("8586acb54a57409bbbda0819aaeba8f7", "court-inventory-status", "Court Inventory & Status"),
    ("76f59adf85ec4f43b240efa842c6bc2e", "venue-executive-dashboard", "Venue Executive Dashboard"),
    ("f181e3cc6372425db3520c8b95b888d7", "academy-dashboard", "Academy Dashboard"),
    ("39a094cf8b5d4c94ab2225b6c4c1e6cb", "notifications-center", "Notifications Center"),
    ("134ed14cc5434abaa5d4b2dee15b4df2", "performance-analytics", "Performance Analytics"),
    ("530aa17448854ad2bfcfd2cd37f0634e", "court-list", "Court List"),
    ("c72a96495bea4759b76b687d274abea7", "add-edit-court", "Add/Edit Court"),
    ("0196a34992e043fc9fb451dbc545d69f", "court-availability-maintenance", "Court Availability & Maintenance"),
    ("7cb17fb8ecd94b2a82d358ba27035893", "court-detail-view", "Court Detail View"),
]


def mcp_call(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
    ).encode()
    req = urllib.request.Request(
        "https://stitch.googleapis.com/mcp",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "X-Goog-Api-Key": API_KEY,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode()
    if raw.startswith("event:") or "data:" in raw[:80]:
        chunks = [line[5:].strip() for line in raw.splitlines() if line.startswith("data:")]
        payload = "\n".join(chunks)
        return json.loads(payload) if payload else {}
    return json.loads(raw)


def download(url: str | None, path: str) -> bool:
    if not url:
        return False
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    with open(path, "wb") as f:
        f.write(data)
    return True


def extract_payload(result: dict[str, Any]) -> Any:
    if "error" in result:
        raise RuntimeError(result["error"])
    r = result.get("result", result)
    if isinstance(r, dict) and "structuredContent" in r:
        return r["structuredContent"]
    if isinstance(r, dict) and "content" in r:
        texts = [c.get("text", "") for c in r["content"] if c.get("type") == "text"]
        blob = "\n".join(texts)
        try:
            return json.loads(blob)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", blob)
            if match:
                return json.loads(match.group(0))
            return {"raw": blob}
    return r


def dig(obj: Any, *keys: str) -> Any:
    cur = obj
    for key in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def find_download_urls(data: Any) -> tuple[str | None, str | None]:
    html_url: str | None = None
    img_url: str | None = None

    def walk(obj: Any, path: str = "") -> None:
        nonlocal html_url, img_url
        if isinstance(obj, dict):
            if "downloadUrl" in obj:
                url = obj["downloadUrl"]
                mime = (obj.get("mimeType") or "").lower()
                lower_path = path.lower()
                if "html" in mime or "html" in lower_path or path.endswith("htmlCode"):
                    html_url = url
                elif (
                    "image" in mime
                    or "png" in mime
                    or "jpeg" in mime
                    or "screenshot" in lower_path
                    or path.endswith("screenshot")
                ):
                    img_url = url
            for key, value in obj.items():
                walk(value, key if not path else f"{path}.{key}")
        elif isinstance(obj, list):
            for index, value in enumerate(obj):
                walk(value, f"{path}[{index}]")

    walk(data)
    html_url = (
        html_url
        or dig(data, "htmlCode", "downloadUrl")
        or dig(data, "screen", "htmlCode", "downloadUrl")
    )
    img_url = (
        img_url
        or dig(data, "screenshot", "downloadUrl")
        or dig(data, "screen", "screenshot", "downloadUrl")
    )

    dump = json.dumps(data)
    if not html_url:
        match = re.search(r'https://[^"\\]+html[^"\\]*', dump, re.I)
        if match:
            html_url = match.group(0)
    if not img_url:
        match = re.search(r'https://[^"\\]+\.(?:png|jpg|jpeg)[^"\\]*', dump, re.I)
        if match:
            img_url = match.group(0)
    return html_url, img_url


def main() -> None:
    manifest: dict[str, Any] = {
        "project": {"title": "FitOra Academy Management App", "id": PROJECT},
        "screens": [],
    }

    for screen_id, slug, title in SCREENS:
        print(f"Fetching {title} ({screen_id})...")
        try:
            if "asset" in screen_id or title == "Design System":
                res = mcp_call("get_project", {"name": f"projects/{PROJECT}"})
                data = extract_payload(res)
                meta_path = os.path.join(OUT, "design-system.json")
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                # Try extracting design system style info + any screenshots from project
                manifest["screens"].append(
                    {
                        "title": title,
                        "id": screen_id,
                        "html": None,
                        "screenshot": None,
                        "type": "DESIGN_SYSTEM_INSTANCE",
                        "meta": "design-system.json",
                    }
                )
                print("  saved design-system meta")
                continue

            res = mcp_call(
                "get_screen",
                {"name": f"projects/{PROJECT}/screens/{screen_id}"},
            )
            if "error" in res:
                res = mcp_call(
                    "get_screen",
                    {"projectId": PROJECT, "screenId": screen_id},
                )

            data = extract_payload(res)
            with open(os.path.join(OUT, f"{slug}.raw.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            html_url, img_url = find_download_urls(data)
            entry: dict[str, Any] = {
                "title": title,
                "id": screen_id,
                "html": None,
                "screenshot": None,
            }

            if html_url:
                html_path = f"{slug}.html"
                ok = download(html_url, os.path.join(OUT, html_path))
                entry["html"] = html_path if ok else None
                print(f"  html: {ok}")
            else:
                print("  html url missing")

            if img_url:
                ext = ".jpg" if re.search(r"\.jpe?g", img_url, re.I) else ".png"
                img_path = f"{slug}{ext}"
                ok = download(img_url, os.path.join(OUT, img_path))
                entry["screenshot"] = img_path if ok else None
                print(f"  img: {ok}")
            else:
                print("  screenshot url missing")

            manifest["screens"].append(entry)
        except Exception as exc:  # noqa: BLE001
            print(f"  ERROR: {exc}")
            manifest["screens"].append({"title": title, "id": screen_id, "error": str(exc)})

    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("DONE")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

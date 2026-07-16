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
    ("dddd713230954ce28686a94dd468437f", "coach-dashboard", "Coach Dashboard"),
    ("6f5df6dd3bd3429cb4dd4fadc37ba8ab", "student-directory", "Student Directory"),
    ("f95826ea670a471d9cfd677381302318", "training-schedule", "Training Schedule"),
    ("fbb1f2e452a94e0ca6571913671377b5", "analytics-overview", "Analytics Overview"),
    ("c135b424bd494c2f8726705e2dcb5d83", "student-profile-detail", "Student Profile Detail"),
    ("405e0f76367f411e9564b82f2a100c06", "training-plan-builder", "Training Plan Builder"),
    ("74253a9f6fb84825a47cdcb914110c4a", "qr-attendance-scanner", "QR Attendance Scanner"),
    ("85b8ce6510434c958af828804e66ab9a", "performance-report", "Performance Report"),
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
    ("b42af0ad7eba489d889d836c76e5b321", "games-services-overview", "Games & Services Overview"),
    ("f151404f1aae41a0a9d2329aead78db6", "membership-plans-setup", "Membership Plans Setup"),
    ("2acee018fd31444b99c609cb2c045032", "tennis-setup-pricing", "Tennis Setup & Pricing"),
    ("d0b84acc3eff460e922fc0f6944d2f9b", "operating-hours-config", "Operating Hours Config"),
    ("2d7b3a4a7f964ab68288396c895f3d29", "slot-type-configurator", "Slot Type Configurator"),
    ("3187e25d46e94feaa877b00eb022f817", "slot-master-calendar", "Slot Master Calendar"),
    ("89dbaf2918e64ae8be9108fa41a0b4d9", "walk-in-booking-form", "Walk-in Booking Form"),
    ("e89f9c0a78fd47cdbab0595eea8f8493", "check-in-qr-scanner", "Check-in / QR Scanner"),
    ("06903a992d1d487ea33b133ab22c9ab8", "player-directory", "Player Directory"),
    ("810311bb2e7843339330c93438ac21b2", "player-profile-detail", "Player Profile Detail"),
    ("a76011db810d496bb0971c526d6b1123", "staff-shift-roster", "Staff Shift Roster"),
    ("dd3d3e16e7b0490e9a23689a8a84d0fe", "coach-directory", "Coach Directory"),
    ("fe489ead94234627a846544e14ce1fbd", "coach-profile-detail", "Coach Profile Detail"),
    ("98ebfe1a27c54cd79484a9d378369850", "financial-settings", "Financial Settings"),
    ("e186dc41eaac465aabcf5a40605f126b", "invoice-detail-view", "Invoice Detail View"),
    ("ff11af7478d94e678cac2eb7298f36e6", "billing-history", "Billing History"),
    ("6972d78be7b2429f938644170ffd0c26", "membership-management", "Membership Management"),
    ("a90d364a414e4c33b930470599e07f32", "expense-tracker", "Expense Tracker"),
    ("cc600fb0a89444b885841f0369485167", "payroll-commission-tracker", "Payroll & Commission Tracker"),
    ("52cd5622b8094490b55e069ce1b2490a", "security-access", "Security & Access"),
    ("838ea7996bb94af984e9ab5bc4f0b440", "app-preferences", "App Preferences"),
    ("c4e5f5c1e3fd4ba38068f3bc8c4abdff", "owner-profile", "Owner Profile"),
    ("efe7b656a92a4e80aab6e4560148a87f", "business-information", "Business Information"),
    ("88c9fbc60873467db59af32d350a65bf", "discounts-promotions", "Discounts & Promotions"),
    ("b25a2e7b011a4618a31333511ab9cf82", "expense-detail-edit", "Expense Detail / Edit"),
    ("61c7985b9a274f4dad9c3ddcec15c451", "payroll-period-detail", "Payroll Period Detail"),
    ("4f7a58a279874de79a4f4df06f82a2eb", "owner-profile-edit-success", "Owner Profile Edit Success"),
    ("0262ba68d0d04fa1b104a7a539c7f1fa", "add-edit-promotion-detail", "Add/Edit Promotion Detail"),
    ("5487e7bd15ad4210b58e4acdad5192df", "invoice-share-payment-reminder", "Invoice Share / Payment Reminder"),
    ("27c4f45be9d642e4a1713e9ab0c377bc", "empty-states-pack", "Empty States Pack"),
    ("95b491f576f3433db459293c2229f237", "staff-shift-editor", "Staff Shift Editor"),
    ("8837a4348c3f4d2fbbd450184223df74", "staff-shift-week-view", "Staff Shift Week View"),
    ("8a27cd062b26466094d37d9b34e4214a", "check-in-success-detail", "Check-in Success Detail"),
    ("a93e85fc31e44ccc8721c865a48e2d73", "qr-check-in-scanner-active", "QR Check-in Scanner Active"),
    ("d6413d985ba449ea9876f3db19102a8f", "walk-in-guest-capture", "Walk-in Guest Capture"),
    ("34585781985f4ce8b956d8308e390ead", "walk-in-booking-confirmation", "Walk-in Booking Confirmation"),
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

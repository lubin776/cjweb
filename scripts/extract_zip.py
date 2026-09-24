#!/usr/bin/env python3
import io
import os
import sys
import zipfile
import urllib.request

ZIP_URL = "https://mpimg.cn/down.php/7047abcedfacbc8d6cdedad03cae2ef9.zip"
DEST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def download(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (GitHub Actions)",
            "Referer": "https://mpimg.cn/",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()

def safe_extract(zf: zipfile.ZipFile, dest: str) -> None:
    """防目录穿越 + 解压到 dest"""
    dest = os.path.abspath(dest)
    for member in zf.infolist():
        target = os.path.abspath(os.path.join(dest, member.filename))
        if not target.startswith(dest + os.sep) and target != dest:
            raise RuntimeError(f"Unsafe path in zip: {member.filename}")
    zf.extractall(dest)

def main() -> int:
    print(f"Downloading: {ZIP_URL}")
    data = download(ZIP_URL)
    print(f"Downloaded {len(data)} bytes")

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        print(f"Zip contains {len(names)} entries")
        for n in names[:20]:
            print("  -", n)
        if len(names) > 20:
            print(f"  ... and {len(names) - 20} more")

        safe_extract(zf, DEST_DIR)

    print(f"Extracted to: {DEST_DIR}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
"""Check and package the approved, already-rendered /brand assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "brand/assets"
PNG_SIZES = {
    "logo.png": (1024, 1024),
    "portrait.png": (1024, 1024),
    "banner-linkedin.png": (1584, 396),
    "banner-x.png": (1500, 500),
    "banner-youtube.png": (2560, 1440),
    "banner-linkedin-colour-fade.png": (1584, 396),
    "banner-x-colour-fade.png": (1500, 500),
    "banner-youtube-colour-fade.png": (2560, 1440),
}


def main():
    ET.parse(ASSETS / "logo.svg")
    if (ASSETS / "logo.svg").read_bytes() != (ROOT / "assets/personal-style/mark.svg").read_bytes():
        raise ValueError("The downloadable logo differs from the site's mark.")
    for name, size in PNG_SIZES.items():
        header = (ASSETS / name).read_bytes()[:24]
        if header[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", header[16:24]) != size:
            raise ValueError(f"Incorrect PNG dimensions: {name}")

    names = ["logo.svg", *PNG_SIZES]
    recipe_path = ROOT / "brand/settings.json"
    recipe = json.loads(recipe_path.read_text())
    recipe["exports"] = [
        {"file": f"assets/{name}", "sha256": hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()}
        for name in names
    ]
    recipe_path.write_text(json.dumps(recipe, indent=2) + "\n")

    output = ASSETS / "miguel-cordero-collar-brand.zip"
    with ZipFile(output, "w", ZIP_DEFLATED) as bundle:
        for name in names:
            bundle.write(ASSETS / name, name)
        bundle.write(recipe_path, "settings.json")
    with ZipFile(output) as bundle:
        if bundle.testzip() is not None or len(bundle.namelist()) != len(names) + 1:
            raise ValueError("Invalid brand ZIP.")
    print(f"Packaged {len(names)} assets and settings: {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

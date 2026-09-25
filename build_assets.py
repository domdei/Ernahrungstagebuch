from __future__ import annotations

import json
import math
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / 'data.md'
JSON_OUT = ROOT / 'food-tolerance.json'
ICONS_DIR = ROOT / 'icons'


def parse_food_data() -> list[dict[str, str]]:
    text = DATA_FILE.read_text(encoding='utf-8')
    match = re.search(r'```csv\s*(.*?)\s*```', text, re.S)
    if not match:
        raise ValueError('CSV block not found in data.md')

    lines = [line.strip() for line in match.group(1).splitlines() if line.strip()]
    records: list[dict[str, str]] = []

    for line in lines:
        if line.startswith('Kategorie,'):
            continue
        cells = [cell.strip() for cell in [part.strip() for part in line.split(',')]]
        if len(cells) < 3:
            continue
        category, name, raw_status = cells[0], cells[1], cells[2]
        match_status = re.search(r'(Grün|Orange|Rot)', raw_status, re.I)
        if not match_status:
            continue
        status = match_status.group(1).lower()
        if status == 'grün':
            status_value = 'green'
        elif status == 'orange':
            status_value = 'orange'
        else:
            status_value = 'red'
        records.append({
            'name': name,
            'category': category,
            'status': status_value,
            'tolerance': status_value,
        })

    return records


def write_food_json(records: list[dict[str, str]]) -> None:
    JSON_OUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')


def make_png(width: int, height: int, color1: tuple[int, int, int], color2: tuple[int, int, int]) -> bytes:
    def lerp(a: int, b: int, t: float) -> int:
        return int(a + (b - a) * t)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            t = (x / max(width - 1, 1)) * 0.7 + (y / max(height - 1, 1)) * 0.3
            r = lerp(color1[0], color2[0], t)
            g = lerp(color1[1], color2[1], t)
            b = lerp(color1[2], color2[2], t)
            raw.extend((r, g, b))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('!IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return signature + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')


def write_icons() -> None:
    ICONS_DIR.mkdir(exist_ok=True)
    for size, start, end in [(192, (12, 42, 86), (20, 122, 215)), (512, (17, 69, 112), (26, 166, 255))]:
        bg = (240, 247, 255)
        accent = (34, 68, 168)
        png = bytearray()
        image = []
        for y in range(size):
            row = []
            for x in range(size):
                nx = (x / (size - 1)) * 2 - 1
                ny = (y / (size - 1)) * 2 - 1
                r = bg[0] + int((accent[0] - bg[0]) * (0.5 + 0.5 * math.sin((nx + ny) * 1.5)))
                g = bg[1] + int((accent[1] - bg[1]) * (0.5 + 0.5 * math.cos((nx - ny) * 1.5)))
                b = bg[2] + int((accent[2] - bg[2]) * (0.5 + 0.4 * math.sin((nx * 1.2 + ny) * 2.1)))
                row.append((r, g, b))
            image.append(row)

        for y in range(size):
            row = image[y]
            png.append(0)
            for x in range(size):
                r, g, b = row[x]
                png.extend((r, g, b))

        def png_chunk(tag: bytes, data: bytes) -> bytes:
            return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)

        data = bytes(png)
        ihdr = struct.pack('!IIBBBBB', size, size, 8, 2, 0, 0, 0)
        png_bytes = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', ihdr) + png_chunk(b'IDAT', zlib.compress(data, 9)) + png_chunk(b'IEND', b'')
        (ICONS_DIR / f'icon-{size}.png').write_bytes(png_bytes)


def bump_version() -> str:
    version_file = ROOT / 'version.json'
    index_file = ROOT / 'index.html'
    sw_file = ROOT / 'sw.js'

    v_data = json.loads(version_file.read_text(encoding='utf-8'))
    current_v = v_data.get('version', '1.0.0')
    parts = current_v.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    new_v = '.'.join(parts)
    v_data['version'] = new_v
    version_file.write_text(json.dumps(v_data, indent=2) + '\n', encoding='utf-8')

    # index.html anpassen
    index_text = index_file.read_text(encoding='utf-8')
    index_text = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={new_v}', index_text)
    index_text = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={new_v}', index_text)
    index_file.write_text(index_text, encoding='utf-8')

    # sw.js anpassen
    sw_text = sw_file.read_text(encoding='utf-8')
    v_num = parts[-1]
    sw_text = re.sub(r"CACHE_NAME = 'ernaehrungstagebuch-pwa-v\d+';", f"CACHE_NAME = 'ernaehrungstagebuch-pwa-v{v_num}';", sw_text)
    sw_text = re.sub(r'styles\.css\?v=[^\']+', f'styles.css?v={new_v}', sw_text)
    sw_text = re.sub(r'app\.js\?v=[^\']+', f'app.js?v={new_v}', sw_text)
    sw_file.write_text(sw_text, encoding='utf-8')

    print(f'Bumped version to {new_v} (sw-cache: v{v_num})')
    return new_v


if __name__ == '__main__':
    import sys
    if '--bump' in sys.argv:
        bump_version()
    records = parse_food_data()
    write_food_json(records)
    # write_icons()  # Deaktiviert, um die benutzerdefinierten Icons nicht zu überschreiben
    print(f'Created {len(records)} food items.')

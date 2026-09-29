"""Read Chromium LevelDB files without opening/modifying the browser database.
Only Ket Cau Studio records are exported. Handles SST Snappy and WAL batches.
"""
import json
import os
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'recovered-templates'

def varint(data, pos=0):
    value = shift = 0
    while True:
        byte = data[pos]; pos += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, pos
        shift += 7
        if shift > 63:
            raise ValueError('Invalid varint')

def snappy(data):
    size, pos = varint(data)
    out = bytearray()
    while pos < len(data):
        tag = data[pos]; pos += 1
        kind = tag & 3
        if kind == 0:
            length = tag >> 2
            if length < 60:
                length += 1
            else:
                count = length - 59
                length = int.from_bytes(data[pos:pos+count], 'little') + 1
                pos += count
            out.extend(data[pos:pos+length]); pos += length
        else:
            if kind == 1:
                length = 4 + ((tag >> 2) & 7)
                offset = ((tag & 224) << 3) | data[pos]; pos += 1
            else:
                length = 1 + (tag >> 2)
                count = 2 if kind == 2 else 4
                offset = int.from_bytes(data[pos:pos+count], 'little'); pos += count
            if not 0 < offset <= len(out):
                raise ValueError('Invalid Snappy offset')
            for _ in range(length):
                out.append(out[-offset])
    if len(out) != size:
        raise ValueError('Invalid Snappy size')
    return bytes(out)

def block(data, handle):
    offset, pos = varint(handle)
    size, _ = varint(handle, pos)
    content = data[offset:offset+size]
    compression = data[offset+size]
    if compression == 1:
        return snappy(content)
    if compression != 0:
        raise ValueError('Unsupported compression')
    return content

def entries(data):
    count = int.from_bytes(data[-4:], 'little')
    end = len(data)-4-count*4
    pos = 0; previous = b''
    while pos < end:
        shared, pos = varint(data, pos)
        unique, pos = varint(data, pos)
        size, pos = varint(data, pos)
        key = previous[:shared] + data[pos:pos+unique]; pos += unique
        value = data[pos:pos+size]; pos += size
        yield key, value
        previous = key

def sst(data):
    footer = data[-48:]
    _, pos = varint(footer); _, pos = varint(footer, pos)
    for _, handle in entries(block(data, footer[pos:])):
        for key, value in entries(block(data, handle)):
            if len(key) >= 8:
                tag = int.from_bytes(key[-8:], 'little')
                yield key[:-8], value, tag >> 8, tag & 255

def wal(data):
    fragments = bytearray()
    for base in range(0, len(data), 32768):
        pos = base; end = min(base+32768, len(data))
        while pos+7 <= end:
            length = int.from_bytes(data[pos+4:pos+6], 'little')
            kind = data[pos+6]; pos += 7
            if not length or pos+length > end:
                break
            piece = data[pos:pos+length]; pos += length
            if kind in (1, 2): fragments = bytearray(piece)
            elif kind in (3, 4): fragments.extend(piece)
            if kind not in (1, 4): continue
            record = bytes(fragments)
            if len(record) < 12: continue
            seq, count = struct.unpack_from('<QI', record)
            p = 12
            for i in range(count):
                tag = record[p]; p += 1
                size, p = varint(record, p)
                key = record[p:p+size]; p += size
                value = b''
                if tag == 1:
                    size, p = varint(record, p)
                    value = record[p:p+size]; p += size
                yield key, value, seq+i, tag

def chromium_string(value):
    if not value: return ''
    if value[0] == 0: return value[1:].decode('utf-16-le')
    if value[0] == 1: return value[1:].decode('latin-1')
    return value.decode('utf-8')

def main():
    OUTPUT.mkdir(exist_ok=True)
    summaries = []
    locations = [('Edge', Path(os.environ['LOCALAPPDATA']) / 'Microsoft/Edge/User Data'),
                 ('Chrome', Path(os.environ['LOCALAPPDATA']) / 'Google/Chrome/User Data'),
                 ('Opera', Path(os.environ['APPDATA']) / 'Opera Software/Opera Stable')]
    for browser, user in locations:
        if not user.exists(): continue
        for profile in [user, *user.iterdir()]:
            if profile != user and profile.name != 'Default' and not profile.name.startswith('Profile '): continue
            db = profile / 'Local Storage/leveldb'
            if not db.exists(): continue
            versions = {}
            for file in db.iterdir():
                if file.suffix not in ('.ldb', '.log'): continue
                try:
                    data = file.read_bytes()
                    records = sst(data) if file.suffix == '.ldb' else wal(data)
                    for key, value, sequence, tag in records:
                        if b'ket-cau-studio-' not in key and 'ket-cau-studio-'.encode('utf-16-le') not in key: continue
                        versions.setdefault(key, []).append((sequence, tag, value, file.name))
                except Exception as error:
                    print(f'Read issue: {browser}/{profile.name}/{file.name}: {type(error).__name__}: {error}')
            for key, history in versions.items():
                sequence, tag, value, source = max(history, key=lambda r: r[0])
                origin = key.split(b'\x00')[0].decode('utf-8', errors='replace').lstrip('_')
                storage_key = chromium_string(key.split(b'\x00', 1)[1])
                if tag != 1:
                    print(f'Deleted record: {browser}/{profile.name} {origin} {storage_key}')
                    continue
                try:
                    content = json.loads(chromium_string(value))
                except Exception as error:
                    print(f'Cannot decode Studio record: {type(error).__name__}')
                    continue
                filename = f'{browser}-{profile.name.replace(" ", "-")}-{len(summaries)+1}.json'
                (OUTPUT / filename).write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding='utf-8')
                summary = dict(browser=browser, profile=profile.name, origin=origin, key=storage_key,
                               sequence=sequence, source=source, file=filename)
                if isinstance(content, list):
                    summary['templates'] = [dict(name=e.get('name'), objects=len(e.get('items', []))) for e in content if isinstance(e, dict)]
                elif isinstance(content, dict): summary['objects'] = len(content.get('items', []))
                summaries.append(summary)
    (OUTPUT / 'sources.json').write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summaries, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()

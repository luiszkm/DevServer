"""Minimal PNG read/write using only the standard library.

Images are lists of rows; each pixel is an (r, g, b, a) tuple.
Reads 8-bit, non-interlaced PNGs of color type 2 (RGB), 3 (palette) and 6 (RGBA).
Writes 8-bit RGBA.
"""
import struct
import zlib


def _paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def read(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: not a PNG")
    pos, idat, plte, trns = 8, b"", None, None
    width = height = depth = ctype = interlace = None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", body)
        elif kind == b"PLTE":
            plte = [tuple(body[i:i + 3]) for i in range(0, len(body), 3)]
        elif kind == b"tRNS":
            trns = body
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
    if depth != 8 or interlace != 0 or ctype not in (2, 3, 6):
        raise ValueError(f"{path}: only 8-bit non-interlaced RGB/RGBA/palette PNGs are supported")
    bpp = {2: 3, 3: 1, 6: 4}[ctype]
    raw = zlib.decompress(idat)
    stride = width * bpp
    prev = bytearray(stride)
    rows, i = [], 0
    for _ in range(height):
        ftype = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            left = line[x - bpp] if x >= bpp else 0
            up = prev[x]
            ul = prev[x - bpp] if x >= bpp else 0
            if ftype == 1:
                line[x] = (line[x] + left) & 255
            elif ftype == 2:
                line[x] = (line[x] + up) & 255
            elif ftype == 3:
                line[x] = (line[x] + ((left + up) >> 1)) & 255
            elif ftype == 4:
                line[x] = (line[x] + _paeth(left, up, ul)) & 255
        prev = line
        if ctype == 2:
            rows.append([(line[x], line[x + 1], line[x + 2], 255) for x in range(0, stride, 3)])
        elif ctype == 6:
            rows.append([tuple(line[x:x + 4]) for x in range(0, stride, 4)])
        else:
            row = []
            for idx in line:
                r, g, b = plte[idx]
                a = trns[idx] if trns is not None and idx < len(trns) else 255
                row.append((r, g, b, a))
            rows.append(row)
    return rows


def write(path, rows):
    height, width = len(rows), len(rows[0])
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for px in row:
            raw.extend(px)

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
        f.write(chunk(b"IEND", b""))

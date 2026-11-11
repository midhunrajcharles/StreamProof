"""Read an Apple .dmg (UDIF, zlib chunks, HFS+) with the standard library only: list files and extract some.

    python video/tools/dmg_extract.py ls   file.dmg
    python video/tools/dmg_extract.py get  file.dmg "<substring of a path>" outdir      # extracts every matching file

Enough for Apple's Design Resources bezel images. Reads on demand (nothing is unpacked to disk until you ask).
"""

import plistlib
import struct
import sys
import zlib
from pathlib import Path

SECTOR = 512


class Udif:
    """Random access to the bytes of the HFS partition of a UDIF disk image."""

    def __init__(self, path):
        self.f = open(path, "rb")
        self.f.seek(-512, 2)
        t = self.f.read(512)
        assert t[:4] == b"koly", "not a UDIF image"
        self.data_off = struct.unpack(">Q", t[24:32])[0]
        xo, xl = struct.unpack(">QQ", t[216:232])
        self.f.seek(xo)
        blkx = plistlib.loads(self.f.read(xl))["resource-fork"]["blkx"]
        part = next(b for b in blkx if "Apple_HFS" in b["Name"])
        d = part["Data"]
        first = struct.unpack(">Q", d[8:16])[0]
        n = struct.unpack(">I", d[200:204])[0]
        self.chunks = []  # (start byte in partition, byte length, type, file offset, compressed length)
        for i in range(n):
            ty, _c, sec, cnt, off, ln = struct.unpack(">IIQQQQ", d[204 + i * 40:204 + (i + 1) * 40])
            if ty == 0xFFFFFFFF:
                break
            if ty == 0x7FFFFFFE:
                continue
            self.chunks.append((sec * SECTOR, cnt * SECTOR, ty, self.data_off + off, ln))
        self.first = first
        self.cache = {}

    def _chunk(self, i):
        if i in self.cache:
            return self.cache[i]
        start, length, ty, off, ln = self.chunks[i]
        if ty in (0, 2):
            data = bytes(length)
        elif ty == 1:
            self.f.seek(off)
            data = self.f.read(ln)
        elif ty == 0x80000005:
            self.f.seek(off)
            data = zlib.decompress(self.f.read(ln))
        else:
            raise NotImplementedError(f"chunk type {ty:#x}")
        if len(self.cache) > 24:
            self.cache.pop(next(iter(self.cache)))
        self.cache[i] = data
        return data

    def read(self, offset, length):
        out = bytearray()
        starts = [c[0] for c in self.chunks]
        import bisect
        i = max(0, bisect.bisect_right(starts, offset) - 1)
        while length > 0 and i < len(self.chunks):
            start, clen, *_ = self.chunks[i]
            data = self._chunk(i)
            lo = max(0, offset - start)
            take = data[lo:lo + length]
            out += take
            offset += len(take)
            length -= len(take)
            i += 1
        return bytes(out)


class Hfs:
    def __init__(self, dev):
        self.dev = dev
        vh = dev.read(1024, 512)
        assert vh[:2] in (b"H+", b"HX"), f"not HFS+ ({vh[:2]!r})"
        self.bs = struct.unpack(">I", vh[40:44])[0]
        self.extents_fork = self._fork(vh[192:272])
        self.catalog_fork = self._fork(vh[272:352])
        self.overflow = {}
        self._load_overflow()
        self.catalog = self._read_fork(self.catalog_fork, 0, self.catalog_fork["size"], None, 0)
        self._index()

    @staticmethod
    def _fork(b):
        size = struct.unpack(">Q", b[:8])[0]
        ext = [struct.unpack(">II", b[16 + i * 8:24 + i * 8]) for i in range(8)]
        return {"size": size, "extents": [(s, c) for s, c in ext if c], "blocks": struct.unpack(">I", b[12:16])[0]}

    def _load_overflow(self):
        raw = self._read_fork(self.extents_fork, 0, self.extents_fork["size"], None, 0, no_overflow=True)
        for rec in self._leaf_records(raw):
            key, val = rec
            klen, ftype, _p, fid, start = struct.unpack(">HBBII", key[:12])
            self.overflow.setdefault((fid, ftype), []).append((start, [struct.unpack(">II", val[i * 8:i * 8 + 8]) for i in range(8) if struct.unpack(">II", val[i * 8:i * 8 + 8])[1]]))

    def _read_fork(self, fork, offset, length, fid, ftype, no_overflow=False):
        extents = list(fork["extents"])
        have = sum(c for _s, c in extents)
        if have < fork["blocks"] and not no_overflow:
            for _start, ex in sorted(self.overflow.get((fid, ftype), [])):
                extents += ex
        out = bytearray()
        pos = 0
        length = min(length, fork["size"] - offset)
        for s, c in extents:
            seg = c * self.bs
            if offset < pos + seg and length > 0:
                lo = max(0, offset - pos)
                take = min(seg - lo, length)
                out += self.dev.read(s * self.bs + lo, take)
                offset += take
                length -= take
            pos += seg
        return bytes(out)

    @staticmethod
    def _leaf_records(tree):
        node_size = struct.unpack(">H", tree[32:34])[0]
        first = struct.unpack(">I", tree[24:28])[0]
        n = first
        while n:
            node = tree[n * node_size:(n + 1) * node_size]
            flink, _b, kind, _h, nrec = struct.unpack(">IIbbH", node[:12])
            for i in range(nrec):
                off = struct.unpack(">H", node[node_size - 2 * (i + 1):node_size - 2 * i])[0]
                klen = struct.unpack(">H", node[off:off + 2])[0]
                data_off = off + 2 + klen
                if data_off % 2:
                    data_off += 1
                yield node[off + 2:off + 2 + klen], node[data_off:]
            n = flink

    def _index(self):
        self.folders, self.files, self.children = {}, {}, {}
        for key, val in self._leaf_records(self.catalog):
            parent, nlen = struct.unpack(">IH", key[:6])
            name = key[6:6 + nlen * 2].decode("utf-16-be")
            rtype = struct.unpack(">H", val[:2])[0]
            if rtype == 1:
                cnid = struct.unpack(">I", val[8:12])[0]
                self.folders[cnid] = (parent, name)
                self.children.setdefault(parent, []).append((name, cnid, True))
            elif rtype == 2:
                cnid = struct.unpack(">I", val[8:12])[0]
                self.files[cnid] = (parent, name, self._fork(val[88:168]), self._fork(val[168:248]))
                self.children.setdefault(parent, []).append((name, cnid, False))

    def path(self, cnid):
        parts = []
        while cnid in self.folders or cnid in self.files:
            parent, name = (self.folders[cnid] if cnid in self.folders else self.files[cnid][:2])
            if parent == 1:
                break
            parts.append(name)
            cnid = parent
        return "/".join(reversed(parts))

    def read_file(self, cnid):
        _p, _n, data, rsrc = self.files[cnid]
        return self._read_fork(data, 0, data["size"], cnid, 0)


def main():
    cmd, dmg = sys.argv[1], sys.argv[2]
    fs = Hfs(Udif(dmg))
    if cmd == "ls":
        for cnid, (_p, _n, data, rsrc) in sorted(fs.files.items(), key=lambda kv: fs.path(kv[0])):
            print(f"{data['size']:>12,}  rsrc {rsrc['size']:>9,}  {fs.path(cnid)}")
    elif cmd == "get":
        pattern, out = sys.argv[3], Path(sys.argv[4])
        out.mkdir(parents=True, exist_ok=True)
        n = 0
        for cnid in fs.files:
            p = fs.path(cnid)
            if pattern.lower() in p.lower():
                dest = out / "".join("in" if ch == '"' else "_" if ch in "*?<>|:" else ch for ch in Path(p).name)
                dest.write_bytes(fs.read_file(cnid))
                print("wrote", dest, dest.stat().st_size)
                n += 1
        print(n, "files")


if __name__ == "__main__":
    main()

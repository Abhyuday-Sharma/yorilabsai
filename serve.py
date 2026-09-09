# -*- coding: utf-8 -*-
"""Dev server for the yorilabs build.

Identical to `python -m http.server` except every response carries
no-store headers, so the browser can never hand you a stale asset.
Swapped images and edited CSS show up on an ordinary refresh.

    python serve.py           # http://localhost:8080
    python serve.py 8777      # any other port
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class _Slice:
    """A read-only window onto an open file, so copyfile stops at the range end."""

    def __init__(self, fh, length):
        self.fh = fh
        self.left = length

    def read(self, n=-1):
        if self.left <= 0:
            return b""
        if n is None or n < 0:
            n = self.left
        chunk = self.fh.read(min(n, self.left))
        self.left -= len(chunk)
        return chunk


class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".woff2": "font/woff2",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
    })

    def send_head(self):
        """Serve byte ranges.

        The stock handler answers every request with the whole file and
        never sends Accept-Ranges, so a browser treats video as
        non-seekable: setting currentTime silently snaps back to 0 and a
        scroll-scrubbed video cannot work at all. Real static hosts do
        this; the dev server has to as well or the two disagree.
        """
        rng = self.headers.get("Range")
        if not rng or not rng.startswith("bytes="):
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        size = os.fstat(f.fileno()).st_size
        first, _, last = rng[6:].partition("-")
        try:
            if first:
                start = int(first)
                end = int(last) if last else size - 1
            else:                                   # bytes=-N, the tail
                start = max(0, size - int(last))
                end = size - 1
        except ValueError:
            f.close()
            return super().send_head()

        if start >= size or start > end:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        end = min(end, size - 1)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        f.seek(start)
        self.copyfile(_Slice(f, end - start + 1), self.wfile)
        f.close()
        return None

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the console quiet; only surface real failures
        code = str(args[1]) if len(args) > 1 else ""
        if code.startswith("4") or code.startswith("5"):
            sys.stderr.write("  %s %s\n" % (code, args[0]))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(NoCacheHandler, directory=".")
    srv = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print("serving %s on http://localhost:%d  (no-store, hard refresh not needed)"
          % (handler.keywords["directory"], port))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()

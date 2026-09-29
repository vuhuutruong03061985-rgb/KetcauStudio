"""Serve only the public app files for a tablet on the same Wi-Fi network."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import socket

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = {'/', '/index.html', '/index.updated.html', '/manifest.webmanifest', '/sw.js',
          '/assets/app.js', '/assets/app.css', '/assets/tablet.js','/assets/calculator.js','/assets/section.js', '/assets/icon.svg',
          '/assets/icon-192.png', '/assets/icon-512.png'}

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        if urlsplit(self.path).path not in PUBLIC:
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=18766)
    parser.add_argument('--bind', default='0.0.0.0')
    args = parser.parse_args()
    print(f'Computer: http://localhost:{args.port}', flush=True)
    for address in sorted(set(socket.gethostbyname_ex(socket.gethostname())[2])):
        if not address.startswith('127.'):
            print(f'Tablet (same Wi-Fi): http://{address}:{args.port}', flush=True)
    print('Keep this window open. Ctrl+C to stop. HTTPS hosting is needed for Android installation/offline.', flush=True)
    ThreadingHTTPServer((args.bind, args.port), Handler).serve_forever()

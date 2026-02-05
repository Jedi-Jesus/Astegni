#!/usr/bin/env python3
"""
Development server with cache disabled for fresh file loading.
Use this instead of 'python -m http.server' during development.
"""

import http.server
import socketserver
from functools import partial

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler that disables caching."""

    def handle(self):
        """Handle request with connection error suppression."""
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Suppress harmless errors when browser cancels requests
            pass

    def guess_type(self, path):
        """Override to add charset=utf-8 to text files."""
        result = super().guess_type(path)

        # Handle different return formats (Python 3.13 compatibility)
        if isinstance(result, tuple):
            mime_type = result[0] if len(result) > 0 else None
            encoding = result[1] if len(result) > 1 else None
        else:
            mime_type = result
            encoding = None

        # Add charset=utf-8 for HTML, CSS, JS, and other text files
        if mime_type and mime_type.startswith(('text/', 'application/javascript', 'application/json')):
            mime_type += '; charset=utf-8'

        return mime_type

    def end_headers(self):
        # Add headers to prevent caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        """Custom log format."""
        print(f"[DEV SERVER] {self.address_string()} - {format % args}")

def run_server(port=8080):
    """Run the development server."""
    handler = NoCacheHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Development server running at http://localhost:{port}/")
        print(f"Serving from: {httpd.server_address}")
        print(f"Cache disabled - all files will be fresh!")
        print(f"\nPress Ctrl+C to stop the server\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")

if __name__ == "__main__":
    run_server(8081)

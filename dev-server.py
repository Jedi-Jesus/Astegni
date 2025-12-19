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

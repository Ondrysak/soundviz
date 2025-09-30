#!/usr/bin/env python3
# /// script
# dependencies = [
#   "livereload",
# ]
# ///
"""
Development server for the soundviz project with auto-reload.
Run with: uv run server.py
"""
import webbrowser
from pathlib import Path
from livereload import Server

PORT = 8000
DIRECTORY = Path(__file__).parent / "threejs-visualizations"

def main():
    server = Server()

    # Watch for changes in all relevant files
    watch_patterns = [
        str(DIRECTORY / "*.html"),
        str(DIRECTORY / "*.js"),
        str(DIRECTORY / "shaders/*.glsl"),
        str(DIRECTORY / "shaders/*.js"),
    ]

    for pattern in watch_patterns:
        server.watch(pattern)

    url = f"http://localhost:{PORT}/"

    print("🎵 Soundviz Development Server")
    print("=" * 60)
    print(f"Server running at: {url}")
    print(f"Serving directory: {DIRECTORY}")
    print(f"\n📁 Watching for changes:")
    print(f"  • HTML files")
    print(f"  • JavaScript files")
    print(f"  • GLSL shader files")
    print(f"\n🔄 Auto-reload enabled - changes will refresh the browser")
    print(f"\nPress Ctrl+C to stop the server")
    print("=" * 60)

    # Open browser
    try:
        webbrowser.open(url)
        print(f"\n✓ Opened browser to {url}")
    except Exception as e:
        print(f"\n⚠ Could not open browser automatically: {e}")
        print(f"  Please open {url} manually")

    try:
        server.serve(port=PORT, root=str(DIRECTORY), open_url=False)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")

if __name__ == "__main__":
    main()


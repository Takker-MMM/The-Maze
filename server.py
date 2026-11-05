"""Serve the maze game locally with Python's standard library."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="迷路ゲームをローカルで配信します")
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="バインドするホスト（Codespacesでは0.0.0.0を使用）",
    )
    parser.add_argument("--port", type=int, default=8000, help="待ち受けるポート")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent
    handler = lambda *request_args, **request_kwargs: SimpleHTTPRequestHandler(
        *request_args, directory=str(project_root), **request_kwargs
    )
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"迷路ゲームを http://{args.host}:{args.port}/ で配信しています")
    print("停止するには Ctrl+C を押してください")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nサーバーを停止しました")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

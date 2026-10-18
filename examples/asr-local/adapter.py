"""Optional local-only ASR adapter. Model weights and Python packages are not bundled.

Install dependencies in a D:-drive virtual environment, then pass a pre-downloaded
multilingual faster-whisper model directory. Does not download weights or write audio.
"""
import argparse
import io
import json
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

MAX_BODY = 10 * 1024 * 1024 + 65536


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', required=True)
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    directory = Path(args.model_dir).resolve()
    if not directory.is_dir():
        parser.error('--model-dir must be an existing local model directory')
    from faster_whisper import WhisperModel
    model = WhisperModel(str(directory), device='cpu', compute_type='int8', local_files_only=True)

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(30)

        def log_message(self, *_):
            pass  # Do not log audio, transcripts, multipart metadata or patient identifiers.

        def reply(self, code, value):
            data = json.dumps(value, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_POST(self):
            if self.path != '/transcribe':
                return self.reply(404, {'error': 'not_found'})
            if self.headers.get('Origin') or self.headers.get('Host') not in (
                    f'127.0.0.1:{args.port}', f'localhost:{args.port}'):
                return self.reply(403, {'error': 'forbidden'})
            content_type = self.headers.get('Content-Type', '')
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length <= 0 or length > MAX_BODY or not content_type.startswith('multipart/form-data;'):
                    return self.reply(413, {'error': 'invalid_upload'})
                payload = self.rfile.read(length)
                if len(payload) != length:
                    return self.reply(400, {'error': 'incomplete_upload'})
                message = BytesParser(policy=policy.default).parsebytes(
                    b'Content-Type: ' + content_type.encode('ascii') + b'\r\nMIME-Version: 1.0\r\n\r\n' + payload)
                fields = {}
                for part in message.iter_parts():
                    name = part.get_param('name', header='content-disposition')
                    if name in fields:
                        return self.reply(400, {'error': 'duplicate_part'})
                    fields[name] = part.get_payload(decode=True)
                language = fields.get('language', b'').decode('ascii')
                audio = fields.get('file', b'')
                if language not in ('zh', 'en') or not audio or len(audio) > 10 * 1024 * 1024:
                    return self.reply(400, {'error': 'invalid_audio'})
                segments, _ = model.transcribe(io.BytesIO(audio), language=language,
                                                beam_size=5, vad_filter=True)
                text = ''.join(segment.text for segment in segments).strip()
                if not text or len(text) > 5000:
                    return self.reply(422, {'error': 'empty_or_long_transcript'})
                return self.reply(200, {'text': text, 'language': language,
                                        'model': 'faster-whisper/' + directory.name[:80]})
            except Exception:
                return self.reply(422, {'error': 'transcription_failed'})

    print(f'Local ASR adapter: http://127.0.0.1:{args.port}/transcribe')
    print('CPU model loaded from local directory. No audio files are written.')
    HTTPServer(('127.0.0.1', args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()

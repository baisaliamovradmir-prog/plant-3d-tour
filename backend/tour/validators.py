import math
from pathlib import Path
from django.core.exceptions import ValidationError


def finite(value):
    if not math.isfinite(value):
        raise ValidationError('Число должно быть конечным.')


def validate_asset(file):
    if not file:
        return
    ext = Path(file.name).suffix.lower()
    limits = {'.jpg': 5, '.jpeg': 5, '.png': 5, '.webp': 5, '.glb': 5, '.pdf': 10, '.mp4': 10}
    if ext not in limits or file.size > limits.get(ext, 0) * 1024 * 1024:
        raise ValidationError('Разрешены JPG/PNG/WebP/GLB до 5 МБ, PDF/MP4 до 10 МБ.')
    file.open('rb')
    head = file.read(16)
    file.seek(0)
    signatures = {'.jpg': head.startswith(b'\xff\xd8\xff'), '.jpeg': head.startswith(b'\xff\xd8\xff'),
        '.png': head.startswith(b'\x89PNG\r\n\x1a\n'), '.webp': head[:4] == b'RIFF' and head[8:12] == b'WEBP',
        '.glb': head[:4] == b'glTF', '.pdf': head.startswith(b'%PDF-'), '.mp4': head[4:8] == b'ftyp'}
    if not signatures[ext]:
        raise ValidationError('Содержимое файла не соответствует расширению.')

from django.db.models.deletion import ProtectedError
from rest_framework.response import Response
from rest_framework.views import exception_handler as default_handler

def exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response({'detail': 'Объект используется другими записями. Сначала измените связи.'}, status=409)
    return default_handler(exc, context)

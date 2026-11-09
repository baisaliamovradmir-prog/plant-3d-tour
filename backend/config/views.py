from django.db import IntegrityError, transaction
from rest_framework import viewsets, serializers
from accounts.permissions import ContentPermission

class ContentViewSet(viewsets.ModelViewSet):
    permission_classes = [ContentPermission]
    filter_fields = ()
    def get_queryset(self):
        qs = super().get_queryset()
        for name in self.filter_fields:
            value = self.request.query_params.get(name)
            if value is not None:
                if name not in ('audience', 'status', 'code'):
                    try:
                        value = int(value)
                        if value < 1:
                            raise ValueError
                    except ValueError:
                        raise serializers.ValidationError({name: 'Ожидается положительный ID.'})
                qs = qs.filter(**{name: value})
        return qs
    def perform_create(self, serializer):
        self.save_checked(serializer)
    def perform_update(self, serializer):
        self.save_checked(serializer)
    def save_checked(self, serializer):
        try:
            with transaction.atomic():
                serializer.save()
        except IntegrityError:
            raise serializers.ValidationError({'detail': 'Нарушено ограничение уникальности или связности данных.'})

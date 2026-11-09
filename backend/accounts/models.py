from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        VISITOR = 'visitor', 'Посетитель'
        MANAGER = 'manager', 'Руководитель'
        EDITOR = 'editor', 'Редактор'
        ADMIN = 'admin', 'Администратор'
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.VISITOR)
    consent_at = models.DateTimeField(null=True, blank=True)
    policy_version = models.CharField(max_length=32, blank=True)

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        self.is_staff = self.is_superuser or self.role in (self.Role.EDITOR, self.Role.ADMIN)
        if kwargs.get('update_fields') is not None:
            kwargs['update_fields'] = set(kwargs['update_fields']) | {'role', 'is_staff'}
        super().save(*args, **kwargs)

    def has_module_perms(self, app_label):
        return self.is_active and (self.is_superuser or self.role == self.Role.ADMIN or
            (self.role == self.Role.EDITOR and app_label in {'tour', 'processes'}))

    def has_perm(self, perm, obj=None):
        return self.is_active and (self.is_superuser or self.role == self.Role.ADMIN or
            (self.role == self.Role.EDITOR and perm.split('.')[0] in {'tour', 'processes'}))

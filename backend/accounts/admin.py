from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class AccountAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('Роль и согласие', {'fields': ('role', 'consent_at', 'policy_version')}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('Роль', {'fields': ('role',)}),)
    list_display = ('username', 'email', 'role', 'is_active')
    readonly_fields = ('consent_at', 'policy_version')

from rest_framework.permissions import BasePermission, SAFE_METHODS

def can_edit(user):
    return user.is_authenticated and (user.is_superuser or user.role in ('editor', 'admin'))

class ContentPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.method in SAFE_METHODS or can_edit(request.user))

class ManagerPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.role in ('manager', 'admin'))

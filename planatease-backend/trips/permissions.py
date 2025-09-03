from rest_framework.permissions import BasePermission


class IsTripOwnerOrMemberReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return (
                obj.owner_id == request.user.id
                or obj.members.filter(user=request.user).exists()
            )
        return obj.owner_id == request.user.id

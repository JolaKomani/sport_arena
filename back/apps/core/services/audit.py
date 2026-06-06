from apps.core.repositories.audit_log_repository import audit_log_repository


def get_client_ip(request):
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(request, action, entity_type, entity_id, changes=None):
    user = None
    if request is not None and getattr(request, 'user', None) and request.user.is_authenticated:
        user = request.user

    audit_log_repository.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        changes=changes or {},
        ip_address=get_client_ip(request),
    )

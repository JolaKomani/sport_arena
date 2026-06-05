from apps.core.models import AuditLog


class AuditLogRepository:
    def create(self, **kwargs):
        return AuditLog.objects.create(**kwargs)


audit_log_repository = AuditLogRepository()

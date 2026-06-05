def stamp_audit(instance, actor):
    if actor is None or not getattr(actor, 'is_authenticated', False):
        return instance
    if not instance.pk and hasattr(instance, 'created_by_id') and not instance.created_by_id:
        instance.created_by = actor
    if hasattr(instance, 'updated_by'):
        instance.updated_by = actor
    return instance

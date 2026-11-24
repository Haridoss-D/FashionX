from rest_framework.throttling import SimpleRateThrottle


class TrackThrottle(SimpleRateThrottle):
    """Limits order lookups and cancellations, so nobody can guess order numbers."""
    scope = "track"

    def get_rate(self):
        return "40/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}

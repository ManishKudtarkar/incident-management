from app.patterns.strategy.p0_alert import P0AlertStrategy
from app.patterns.strategy.p2_alert import P2AlertStrategy
from app.utils.logger import get_logger

logger = get_logger("alert_service")


def alert_incident(incident) -> None:
    """Dispatch the correct alert strategy based on incident severity."""
    severity = getattr(incident, "severity", None)
    # Support both enum instances and plain strings
    severity_value = severity.value if hasattr(severity, "value") else str(severity)

    if severity_value == "P0":
        strategy = P0AlertStrategy()
    else:
        strategy = P2AlertStrategy()

    logger.info("Alerting for incident %s with severity %s", getattr(incident, "id", "?"), severity_value)
    strategy.alert(incident)

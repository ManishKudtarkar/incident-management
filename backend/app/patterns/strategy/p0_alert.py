from app.patterns.strategy.alert_strategy import AlertStrategy
from app.utils.logger import get_logger

logger = get_logger("p0_alert")


class P0AlertStrategy(AlertStrategy):
    """Critical (P0) alert strategy — pages on-call immediately."""

    def alert(self, incident) -> None:
        logger.critical(
            "[P0 ALERT] CRITICAL incident detected! "
            "component=%s  incident_id=%s  status=%s",
            getattr(incident, "component_id", "unknown"),
            getattr(incident, "id", "unknown"),
            getattr(incident, "status", "unknown"),
        )
        # In production: integrate PagerDuty / OpsGenie / SNS here
        # e.g. pagerduty_client.trigger(incident)

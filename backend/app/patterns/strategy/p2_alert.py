from app.patterns.strategy.alert_strategy import AlertStrategy
from app.utils.logger import get_logger

logger = get_logger("p2_alert")


class P2AlertStrategy(AlertStrategy):
    """Warning (P2) alert strategy — sends a Slack / email notification."""

    def alert(self, incident) -> None:
        logger.warning(
            "[P2 ALERT] Warning incident detected. "
            "component=%s  incident_id=%s  status=%s",
            getattr(incident, "component_id", "unknown"),
            getattr(incident, "id", "unknown"),
            getattr(incident, "status", "unknown"),
        )
        # In production: integrate Slack webhook / SendGrid here
        # e.g. slack_client.post_message(incident)

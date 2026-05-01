from __future__ import annotations
from app.patterns.state.base_state import IncidentState


class OpenState(IncidentState):
    def next(self) -> IncidentState:
        # Lazy import to break circular dependency
        from app.patterns.state.investigating_state import InvestigatingState
        return InvestigatingState(self.incident)

    def prev(self) -> IncidentState:
        return self

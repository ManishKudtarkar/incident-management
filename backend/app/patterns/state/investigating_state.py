from __future__ import annotations
from app.patterns.state.base_state import IncidentState


class InvestigatingState(IncidentState):
    def next(self) -> IncidentState:
        from app.patterns.state.resolved_state import ResolvedState
        return ResolvedState(self.incident)

    def prev(self) -> IncidentState:
        from app.patterns.state.open_state import OpenState
        return OpenState(self.incident)

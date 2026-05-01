from __future__ import annotations
from app.patterns.state.base_state import IncidentState


class ClosedState(IncidentState):
    def next(self) -> IncidentState:
        return self  # Terminal state

    def prev(self) -> IncidentState:
        from app.patterns.state.resolved_state import ResolvedState
        return ResolvedState(self.incident)

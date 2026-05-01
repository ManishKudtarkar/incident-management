from __future__ import annotations
from app.patterns.state.base_state import IncidentState


class ResolvedState(IncidentState):
    def next(self) -> IncidentState:
        from app.patterns.state.closed_state import ClosedState
        return ClosedState(self.incident)

    def prev(self) -> IncidentState:
        from app.patterns.state.investigating_state import InvestigatingState
        return InvestigatingState(self.incident)

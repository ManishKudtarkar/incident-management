from app.patterns.state.open_state import OpenState
from app.patterns.state.investigating_state import InvestigatingState
from app.patterns.state.resolved_state import ResolvedState
from app.patterns.state.closed_state import ClosedState

def test_incident_lifecycle():
	class DummyIncident:
		pass
	incident = DummyIncident()
	state = OpenState(incident)
	assert isinstance(state, OpenState)
	state = state.next()
	assert isinstance(state, InvestigatingState)
	state = state.next()
	assert isinstance(state, ResolvedState)
	state = state.next()
	assert isinstance(state, ClosedState)

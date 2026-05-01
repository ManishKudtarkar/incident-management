class IncidentState:
	def __init__(self, incident):
		self.incident = incident

	def next(self):
		raise NotImplementedError

	def prev(self):
		raise NotImplementedError

	def name(self):
		return self.__class__.__name__

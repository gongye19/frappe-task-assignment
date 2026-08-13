from frappe.model.document import Document


class SchoolTask(Document):
	def validate(self):
		self.priority_rank = {"High": 3, "Medium": 2, "Low": 1}.get(self.priority, 0)

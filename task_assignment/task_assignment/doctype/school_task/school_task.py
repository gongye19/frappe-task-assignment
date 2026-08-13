from frappe.model.document import Document
from frappe.utils import today


class SchoolTask(Document):
	def before_insert(self):
		self.start_date = self.start_date or today()

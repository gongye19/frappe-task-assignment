import frappe
from frappe import _
from frappe.model.document import Document


class SchoolStudent(Document):
	def validate(self):
		if self.user and "Student" not in frappe.get_roles(self.user):
			frappe.throw(_("Only accounts with the Student role can be added."))

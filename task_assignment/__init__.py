__version__ = "0.0.1"


def has_app_permission():
	import frappe

	return bool({"Teacher", "Student", "System Manager"} & set(frappe.get_roles()))

import frappe


def execute():
	for user in ("Administrator", "teacher@example.com", "student@example.com"):
		if frappe.db.exists("User", user):
			frappe.db.set_value("User", user, "language", "en", update_modified=False)

import frappe


def execute():
	frappe.db.set_value(
		"School Task",
		{"assigned_to": "student@example.com"},
		"assigned_to",
		"陈老师",
		update_modified=False,
	)

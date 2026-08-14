import frappe


def execute():
	frappe.db.set_single_value("System Settings", "enable_password_policy", 0)
	frappe.db.set_single_value("System Settings", "minimum_password_score", "")

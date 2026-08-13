import frappe


def execute():
	frappe.db.sql(
		"""update `tabSchool Task`
		set start_date = date(creation)
		where start_date is null"""
	)

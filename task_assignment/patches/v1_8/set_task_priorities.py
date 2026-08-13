import frappe


def execute():
	frappe.db.sql(
		"""update `tabSchool Task`
		set priority = 'Medium'
		where coalesce(priority, '') = ''"""
	)
	frappe.db.sql(
		"""update `tabSchool Task`
		set priority_rank = case priority
			when 'High' then 3
			when 'Medium' then 2
			when 'Low' then 1
			else 0
		end"""
	)

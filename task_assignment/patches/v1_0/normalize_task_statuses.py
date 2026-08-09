import frappe


def execute():
	frappe.db.sql(
		"""
		update `tabSchool Task`
		set status = case
			when status = '已提交' then '已提交'
			when status = '已完成' then '已完成'
			else '待办'
		end
		"""
	)

	users = frappe.db.sql_list(
		"select `user` from `__UserSettings` where `doctype` = 'School Task'"
	)
	frappe.db.sql("delete from `__UserSettings` where `doctype` = 'School Task'")
	for user in users:
		frappe.cache.hdel("_user_settings", f"School Task::{user}")

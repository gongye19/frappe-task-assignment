import frappe


def execute():
	status_maps = {
		"School Task": {
			"待办": "To Do",
			"已提交": "Submitted",
			"已完成": "Completed",
			"已归档": "Archived",
		},
		"School Project": {"进行中": "Active", "已归档": "Archived"},
		"School Student": {"在读": "Enrolled", "停用": "Disabled"},
	}

	for doctype, values in status_maps.items():
		for old_value, new_value in values.items():
			frappe.db.sql(
				f"update `tab{doctype}` set `status` = %s where `status` = %s",
				(new_value, old_value),
			)
		clear_list_settings(doctype)


def clear_list_settings(doctype):
	users = frappe.db.sql_list(
		"select `user` from `__UserSettings` where `doctype` = %s",
		(doctype,),
	)
	frappe.db.delete("__UserSettings", {"doctype": doctype})
	for user in users:
		frappe.cache.hdel("_user_settings", f"{doctype}::{user}")

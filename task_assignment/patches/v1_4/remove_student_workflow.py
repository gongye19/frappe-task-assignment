import frappe


def execute():
	frappe.db.set_value(
		"School Task", {"status": "Submitted"}, "status", "To Do", update_modified=False
	)
	if frappe.db.exists("User", "student@example.com"):
		frappe.db.set_value("User", "student@example.com", "enabled", 0)

	demo_task = frappe.db.get_value(
		"School Task", {"task_title": "校园节活动方案"}, ["name", "description"], as_dict=True
	)
	if demo_task and demo_task.description == "提交一份一页的活动方案，包含主题、流程和人员分工。":
		frappe.db.set_value(
			"School Task",
			demo_task.name,
			"description",
			"整理一页活动方案，记录主题、流程和人员分工。",
		)

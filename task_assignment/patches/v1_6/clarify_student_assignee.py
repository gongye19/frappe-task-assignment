import frappe

from task_assignment.install import configure_task_list


def execute():
	configure_task_list()
	frappe.db.set_value(
		"School Task",
		{"assigned_to": "陈老师"},
		"assigned_to",
		"林小满",
		update_modified=False,
	)

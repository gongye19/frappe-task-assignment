import os

import frappe
from frappe.utils import add_days, today


def before_install():
	for role_name in ("Teacher",):
		if not frappe.db.exists("Role", role_name):
			frappe.get_doc(
				{
					"doctype": "Role",
					"role_name": role_name,
					"desk_access": 1,
					"home_page": "/desk/school-task/view/list",
					"is_custom": 1,
				}
			).insert(ignore_permissions=True)
		else:
			frappe.db.set_value("Role", role_name, "home_page", "/desk/school-task/view/list")


def after_install():
	setup_demo()
	configure_task_list()


def setup_demo():
	before_install()
	frappe.db.set_default("desktop:home_page", "workspace")
	frappe.db.set_single_value("System Settings", "login_with_email_link", 0)
	frappe.db.set_single_value("Website Settings", "disable_signup", 1)
	frappe.db.set_value(
		"User", "Administrator", {"language": "en", "default_app": "task_assignment"}
	)

	if not frappe.db.exists("User", "teacher@example.com"):
		teacher_values = {
			"doctype": "User",
			"email": "teacher@example.com",
			"first_name": "陈老师",
			"language": "en",
			"send_welcome_email": 0,
			"user_type": "System User",
		}
		if password := get_demo_password("TASK_ASSIGNMENT_TEACHER_PASSWORD"):
			teacher_values["new_password"] = password
		frappe.get_doc(teacher_values).insert(ignore_permissions=True)
	teacher = frappe.get_doc("User", "teacher@example.com")
	teacher.add_roles("Teacher")
	configure_task_only_user(teacher)

	demo_task = frappe.db.get_value(
		"School Task", {"task_title": "校园节活动方案"}, "name"
	)
	if not demo_task:
		frappe.get_doc(
			{
				"doctype": "School Task",
				"task_title": "校园节活动方案",
				"assigned_to": "林小满",
				"due_date": add_days(today(), 3),
				"description": "整理一页活动方案，记录主题、流程和人员分工。",
			}
		).insert(ignore_permissions=True)
	elif not frappe.db.get_value("School Task", demo_task, "assigned_to"):
		frappe.db.set_value("School Task", demo_task, "assigned_to", "林小满")


def configure_task_only_user(user):
	user.default_app = "task_assignment"
	for fieldname in (
		"search_bar",
		"notifications",
		"list_sidebar",
		"bulk_actions",
		"view_switcher",
		"form_sidebar",
		"form_navigation_buttons",
		"timeline",
		"dashboard",
	):
		user.set(fieldname, 0)

	blocked_modules = frappe.get_all(
		"Module Def", filters={"name": ["!=", "Task Assignment"]}, pluck="name"
	)
	user.set("block_modules", [{"module": module} for module in blocked_modules])
	user.save(ignore_permissions=True)


def configure_task_list():
	if not frappe.db.exists("List View Settings", "School Task"):
		frappe.get_doc(
			{
				"doctype": "List View Settings",
				"name": "School Task",
				"show_tags": 1,
			}
		).insert(ignore_permissions=True)
	else:
		frappe.db.set_value("List View Settings", "School Task", "show_tags", 1)


def get_demo_password(environment_name):
	config_name = environment_name.lower()
	return os.environ.get(environment_name) or frappe.conf.get(config_name)

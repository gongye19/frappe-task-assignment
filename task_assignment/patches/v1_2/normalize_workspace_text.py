import json

import frappe


WORKSPACE_CONTENT = [
	{
		"id": "task-title",
		"type": "header",
		"data": {"text": '<span class="h2">Task Center</span>', "col": 12},
	},
	{
		"id": "task-help",
		"type": "paragraph",
		"data": {
			"text": "Open tasks, projects, or students to assign work, collect submissions, and complete reviews.",
			"col": 12,
		},
	},
	{
		"id": "task-list",
		"type": "shortcut",
		"data": {"shortcut_name": "Task List", "col": 4},
	},
	{
		"id": "project-list",
		"type": "shortcut",
		"data": {"shortcut_name": "Project Directory", "col": 4},
	},
	{
		"id": "student-list",
		"type": "shortcut",
		"data": {"shortcut_name": "Student Directory", "col": 4},
	},
]


def execute():
	if not frappe.db.exists("Workspace", "Task Center"):
		return

	doc = frappe.get_doc("Workspace", "Task Center")
	doc.label = "Task Center"
	doc.title = "Task Center"
	doc.content = json.dumps(WORKSPACE_CONTENT, separators=(",", ":"))
	labels = ["Task List", "Project Directory", "Student Directory"]
	for shortcut, label in zip(doc.shortcuts, labels):
		shortcut.label = label
	doc.save(ignore_permissions=True)

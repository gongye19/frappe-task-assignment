import json

import frappe
from frappe import _
from frappe.model.document import Document


PROTECTED_FIELDS = (
	"task_title",
	"project",
	"assigned_to",
	"due_date",
	"status",
	"is_published",
	"description",
	"task_attachment",
	"teacher_feedback",
)
VALID_STATUSES = ("To Do", "Submitted", "Completed", "Archived")


class SchoolTask(Document):
	def after_insert(self):
		# New documents do not pass through Frappe's reset_seen(), so explicitly
		# mark the creator as having read the task.
		self.db_set("_seen", json.dumps([frappe.session.user]), update_modified=False)

	def validate(self):
		if self.status and self.status not in VALID_STATUSES:
			frappe.throw(_("Invalid task status."))

		if self.is_published:
			self.validate_for_publish()
		elif self.assigned_to and "Student" not in frappe.get_roles(self.assigned_to):
			frappe.throw(_("Tasks can only be assigned to students."))

		if self.is_new():
			self.assigned_by = frappe.session.user
			return

		if _is_manager():
			return

		before = self.get_doc_before_save()
		protected_fields = PROTECTED_FIELDS
		if self.flags.get("allow_archive"):
			protected_fields = tuple(field for field in PROTECTED_FIELDS if field != "status")

		if any(self.get(field) != before.get(field) for field in protected_fields):
			frappe.throw(_("Students can only edit their submission."), frappe.PermissionError)

		submission_changed = (
			self.submission_note != before.submission_note
			or self.submission_file != before.submission_file
		)
		if submission_changed and before.status in {"Completed", "Archived"}:
			frappe.throw(_("Completed or archived tasks can no longer be submitted."))
		if submission_changed:
			self.status = "Submitted"

	def validate_for_publish(self):
		required_fields = {
			"task_title": _("Task Title"),
			"assigned_to": _("Assigned Student"),
			"due_date": _("Due Date"),
			"description": _("Instructions"),
		}
		missing = [label for fieldname, label in required_fields.items() if not self.get(fieldname)]
		if missing:
			separator = "、" if frappe.local.lang == "zh" else ", "
			frappe.throw(_("Please complete these fields before publishing: {0}").format(separator.join(missing)))
		if "Student" not in frappe.get_roles(self.assigned_to):
			frappe.throw(_("Tasks can only be assigned to students."))


@frappe.whitelist()
def publish_task(name):
	if not _is_manager():
		frappe.throw(_("Only teachers can publish tasks."), frappe.PermissionError)

	doc = frappe.get_doc("School Task", name)
	doc.check_permission("write")
	doc.is_published = 1
	doc.status = doc.status or "To Do"
	doc.save()
	return doc


@frappe.whitelist()
def archive_task(name):
	doc = frappe.get_doc("School Task", name)
	doc.check_permission("write")
	if doc.status != "Completed":
		frappe.throw(_("Only completed tasks can be archived."))
	if not _is_manager() and doc.assigned_to != frappe.session.user:
		frappe.throw(_("You can only archive your own task."), frappe.PermissionError)

	doc.flags.allow_archive = True
	doc.status = "Archived"
	doc.save()
	return doc


@frappe.whitelist()
def archive_tasks(names):
	names = frappe.parse_json(names) if isinstance(names, str) else names
	if not isinstance(names, list) or not names:
		frappe.throw(_("Please select at least one task."))
	for name in names:
		archive_task(name)
	return {"archived": names}


@frappe.whitelist()
def get_unread_tasks():
	rows = frappe.get_list(
		"School Task",
		filters={"status": ["!=", "Archived"]},
		fields=["name", "_seen"],
		order_by="modified desc",
		limit_page_length=0,
	)
	unread_names = []
	for row in rows:
		seen_by = frappe.parse_json(row._seen) if row._seen else []
		if frappe.session.user not in seen_by:
			unread_names.append(row.name)
	return {"count": len(unread_names), "names": unread_names}


def _is_manager(user=None):
	user = user or frappe.session.user
	roles = frappe.get_roles(user)
	return user == "Administrator" or "System Manager" in roles or "Teacher" in roles


def get_permission_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_manager(user):
		return None
	return (
		f"`tabSchool Task`.assigned_to = {frappe.db.escape(user)}"
		" and `tabSchool Task`.is_published = 1"
	)


def has_permission(doc, ptype="read", user=None):
	user = user or frappe.session.user
	if _is_manager(user):
		return True
	if ptype == "create":
		return False
	return doc.assigned_to == user and bool(doc.is_published)

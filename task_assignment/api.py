import frappe
from frappe import _


SUPPORTED_LANGUAGES = {"zh", "en"}


@frappe.whitelist()
def set_language(language: str):
	"""Change the signed-in user's Desk language and reload their boot data."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in before changing the language."), frappe.PermissionError)
	if language not in SUPPORTED_LANGUAGES:
		frappe.throw(_("Unsupported language."))

	frappe.db.set_value("User", frappe.session.user, "language", language, update_modified=False)
	frappe.clear_cache(user=frappe.session.user)
	return language

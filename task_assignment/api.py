import frappe
from frappe import _


SUPPORTED_LANGUAGES = {"zh", "en"}


def validate_language(language: str):
	if language not in SUPPORTED_LANGUAGES:
		frappe.throw(_("Unsupported language."))


@frappe.whitelist()
def get_language_messages(language: str):
	"""Return a Desk translation bundle without changing the signed-in user."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in before changing the language."), frappe.PermissionError)
	validate_language(language)

	from frappe.translate import get_messages_for_boot

	original_language = frappe.local.lang
	try:
		frappe.local.lang = language
		return get_messages_for_boot()
	finally:
		frappe.local.lang = original_language


@frappe.whitelist()
def set_language(language: str):
	"""Change the signed-in user's Desk language and reload their boot data."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in before changing the language."), frappe.PermissionError)
	validate_language(language)

	frappe.db.set_value("User", frappe.session.user, "language", language, update_modified=False)
	frappe.clear_cache(user=frappe.session.user)
	return language

frappe.ui.form.on("School Task", {
	refresh(frm) {
		frm.page.set_primary_action(__("Save"), () => save_and_exit(frm));

		if (!frm.is_new()) {
			frm.add_custom_button(__("Add Tags"), () => show_tag_dialog(frm), __("Actions"))
				.addClass("task-action-button");
			frm.add_custom_button(__("Delete"), () => frm.savetrash(), __("Actions"))
				.addClass("task-action-button");
		}
	},
	after_save(frm) {
		frappe.set_route("school-task", "view", "list");
	},
});

async function save_and_exit(frm) {
	if (frm.is_new() || frm.is_dirty()) {
		await frm.save();
		return;
	}
	frappe.set_route("school-task", "view", "list");
}

function show_tag_dialog(frm) {
	frappe.prompt(
		{
			fieldtype: "Data",
			fieldname: "tag",
			label: __("Tag"),
			reqd: true,
		},
		(values) => {
			frappe.call({
				method: "frappe.desk.doctype.tag.tag.add_tag",
				args: {
					tag: values.tag,
					dt: frm.doctype,
					dn: frm.doc.name,
				},
				callback() {
					frappe.show_alert({ message: __("Tag added"), indicator: "green" });
				},
			});
		},
		__("Add Tags"),
		__("Add")
	);
}

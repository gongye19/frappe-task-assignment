frappe.ui.form.on("School Task", {
	refresh(frm) {
		const is_teacher =
			frappe.session.user === "Administrator" ||
			frappe.user.has_role(["Teacher", "System Manager"]);
		setTimeout(() => window.task_assignment_refresh_unread?.(), 0);

		frm.page.set_primary_action(__("Save"), () => save_and_exit(frm));

		if (is_teacher && !frm.doc.is_published) {
			frm.add_custom_button(__("Publish"), () => publish_task(frm))
				.addClass("task-publish-button");
		}

		if (!frm.is_new()) {
			frm.add_custom_button(__("Add Tags"), () => show_tag_dialog(frm), __("Actions"))
				.addClass("task-action-button");
			if (!is_teacher && frm.doc.status === "Completed") {
				frm.add_custom_button(__("Archive"), () => archive_task(frm), __("Actions"))
					.addClass("task-action-button");
			}
			if (is_teacher) {
				frm.add_custom_button(__("Delete"), () => frm.savetrash(), __("Actions"))
					.addClass("task-action-button");
			}
		}
	},
	after_save(frm) {
		if (!frm.__publishing_task) {
			frappe.set_route("school-task", "view", "list");
		}
	},
});

async function save_and_exit(frm) {
	if (frm.is_new() || frm.is_dirty()) {
		await frm.save();
		return;
	}
	frappe.set_route("school-task", "view", "list");
}

async function archive_task(frm) {
	await frappe.call({
		method: "task_assignment.task_assignment.doctype.school_task.school_task.archive_task",
		args: { name: frm.doc.name },
		freeze: true,
		freeze_message: __("Archiving task…"),
	});
	frappe.show_alert({ message: __("Task archived"), indicator: "green" });
	frappe.set_route("school-task", "view", "list");
}

async function publish_task(frm) {
	frm.__publishing_task = true;
	try {
		if (frm.is_new() || frm.is_dirty()) await frm.save();

		await frappe.call({
			method: "task_assignment.task_assignment.doctype.school_task.school_task.publish_task",
			args: { name: frm.doc.name },
			freeze: true,
			freeze_message: __("Publishing task…"),
		});
		frappe.show_alert({ message: __("Task published"), indicator: "green" });
		frappe.set_route("school-task", "view", "list");
	} finally {
		frm.__publishing_task = false;
	}
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

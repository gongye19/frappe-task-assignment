frappe.listview_settings["School Student"] = {
	hide_name_filter: true,
	hide_name_column: true,
	onload(listview) {
		listview.page_length = 20;
		listview.selected_page_count = 20;
		listview.page.page_form.addClass("compact-list-toolbar");

		const allowed_sort_fields = new Set(["modified", "student_name"]);
		listview.page.page_form.find(".sort-selector .option").each(function () {
			if (!allowed_sort_fields.has(this.dataset.value)) {
				this.closest("li")?.remove();
			}
		});
	},
};

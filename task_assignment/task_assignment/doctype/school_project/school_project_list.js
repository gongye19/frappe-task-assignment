frappe.listview_settings["School Project"] = {
	hide_name_filter: true,
	onload(listview) {
		listview.page_length = 20;
		listview.selected_page_count = 20;
		listview.page.page_form.addClass("compact-list-toolbar");

		const allowed_sort_fields = new Set(["modified", "project_name"]);
		listview.page.page_form.find(".sort-selector .option").each(function () {
			if (!allowed_sort_fields.has(this.dataset.value)) {
				this.closest("li")?.remove();
			}
		});
	},
};

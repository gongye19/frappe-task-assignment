const TASK_STATUSES = ["To Do", "Submitted", "Completed", "Archived"];
const DEFAULT_TASK_STATUSES = ["To Do", "Submitted", "Completed"];

frappe.listview_settings["School Task"] = {
	add_fields: ["is_published"],
	hide_name_filter: true,
	onload(listview) {
		listview.page_length = 20;
		listview.selected_page_count = 20;
		listview.page.page_form.addClass("compact-list-toolbar");
		setup_status_filter(listview);

		const allowed_sort_fields = new Set(["modified", "due_date"]);
		listview.page.page_form.find(".sort-selector .option").each(function () {
			if (!allowed_sort_fields.has(this.dataset.value)) {
				this.closest("li")?.remove();
			}
		});

		const is_teacher =
			frappe.session.user === "Administrator" ||
			frappe.user.has_role(["Teacher", "System Manager"]);
		if (!is_teacher) add_archive_action(listview);
	},
	refresh() {
		window.task_assignment_refresh_unread?.();
	},
	get_indicator(doc) {
		if (!doc.is_published) return [__("Draft"), "grey", "is_published,=,0"];
		const colors = {
			"To Do": "orange",
			Submitted: "blue",
			Completed: "green",
			Archived: "grey",
		};
		return [__(doc.status), colors[doc.status] || "grey", `status,=,${doc.status}`];
	},
};

function setup_status_filter(listview) {
	if (listview.__task_status_filter_ready) return;
	listview.__task_status_filter_ready = true;
	listview.task_statuses = new Set(DEFAULT_TASK_STATUSES);

	const get_args = listview.get_args.bind(listview);
	listview.get_args = () => {
		const args = get_args();
		args.filters = (args.filters || []).filter((filter) => filter[1] !== "status");
		const selected = [...listview.task_statuses];
		if (selected.length !== TASK_STATUSES.length) {
			args.filters.push([
				"School Task",
				"status",
				"in",
				selected.length ? selected : ["__NO_MATCHING_STATUS__"],
			]);
		}
		return args;
	};

	const filter_section = listview.page.page_form.find(".standard-filter-section")[0];
	if (!filter_section) return;

	const filter = document.createElement("div");
	filter.className = "task-status-filter";
	const button = document.createElement("button");
	button.type = "button";
	button.className = "btn btn-default btn-sm task-status-filter-button";
	button.setAttribute("aria-haspopup", "true");
	button.setAttribute("aria-expanded", "false");

	const label = document.createElement("span");
	label.className = "task-status-filter-label";
	const caret = document.createElement("span");
	caret.className = "task-status-filter-caret";
	caret.innerHTML = frappe.utils.icon("select", "xs");
	button.append(label, caret);

	const menu = document.createElement("div");
	menu.className = "task-status-filter-menu";
	menu.hidden = true;
	menu.setAttribute("role", "menu");

	const update_label = () => {
		label.textContent = `${__("Status")} · ${listview.task_statuses.size}`;
	};
	TASK_STATUSES.forEach((status) => {
		const option = document.createElement("label");
		option.className = "task-status-filter-option";
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = status;
		checkbox.checked = listview.task_statuses.has(status);
		const text = document.createElement("span");
		text.textContent = __(status);
		option.append(checkbox, text);
		checkbox.addEventListener("change", () => {
			if (checkbox.checked) listview.task_statuses.add(status);
			else listview.task_statuses.delete(status);
			update_label();
			listview.start = 0;
			listview.last_args = null;
			listview.refresh();
		});
		menu.append(option);
	});
	update_label();

	button.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		menu.hidden = !menu.hidden;
		button.setAttribute("aria-expanded", String(!menu.hidden));
	});
	menu.addEventListener("click", (event) => event.stopPropagation());
	document.addEventListener("click", () => {
		menu.hidden = true;
		button.setAttribute("aria-expanded", "false");
	});

	filter.append(button, menu);
	filter_section.prepend(filter);
}

function add_archive_action(listview) {
	listview.page.add_actions_menu_item(__("Archive"), async () => {
		const selected = listview.get_checked_items();
		if (!selected.length) return;
		if (selected.some((task) => task.status !== "Completed")) {
			frappe.msgprint(__("Only completed tasks can be archived."));
			return;
		}

		await frappe.call({
			method: "task_assignment.task_assignment.doctype.school_task.school_task.archive_tasks",
			args: { names: selected.map((task) => task.name) },
			freeze: true,
			freeze_message: __("Archiving task…"),
		});
		frappe.show_alert({ message: __("Task archived"), indicator: "green" });
		listview.clear_checked_items();
		listview.last_args = null;
		listview.refresh();
	}, true);
}

const TASK_STATUSES = ["To Do", "Completed", "Archived"];
const DEFAULT_TASK_STATUSES = ["To Do", "Completed"];

frappe.listview_settings["School Task"] = {
	hide_name_column: true,
	hide_name_filter: true,
	onload(listview) {
		listview.page_length = 20;
		listview.selected_page_count = 20;
		listview.page.page_form.addClass("compact-list-toolbar");
		setup_initial_loading_state(listview);
		setup_status_filter(listview);
		setup_priority_sort(listview);

		const allowed_sort_fields = new Set(["modified", "due_date", "priority"]);
		listview.page.page_form.find(".sort-selector .option").each(function () {
			if (!allowed_sort_fields.has(this.dataset.value)) {
				this.closest("li")?.remove();
			}
		});
	},
	refresh(listview) {
		center_empty_state(listview);
	},
	get_indicator(doc) {
		const colors = {
			"To Do": "orange",
			Completed: "green",
			Archived: "grey",
		};
		return [__(doc.status), colors[doc.status] || "grey", `status,=,${doc.status}`];
	},
};

function center_empty_state(listview) {
	if (listview.data.length) return;
	const empty = listview.$no_result?.[0];
	if (!empty) return;
	const top = Math.max(0, Math.round(empty.getBoundingClientRect().top));
	empty.style.display = "flex";
	empty.style.height = `calc(100dvh - ${top}px)`;
}

function setup_initial_loading_state(listview) {
	const list = listview.$frappe_list;
	const loading = $(
		`<div class="task-list-initial-loader text-muted" role="status">${__("Loading")}...</div>`
	).appendTo(list);
	const refresh = listview.refresh;
	let first_refresh = true;

	list.addClass("task-list-loading");
	listview.refresh = (...args) => {
		if (!first_refresh) return refresh(...args);
		first_refresh = false;
		return Promise.resolve(refresh(...args)).finally(() => {
			list.removeClass("task-list-loading");
			loading.remove();
		});
	};
}

function setup_priority_sort(listview) {
	const get_args = listview.get_args.bind(listview);
	listview.get_args = () => {
		const args = get_args();
		if (listview.sort_selector.sort_by === "priority") {
			args.order_by = args.order_by.replace("`priority`", "`priority_rank`");
		}
		return args;
	};
}

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

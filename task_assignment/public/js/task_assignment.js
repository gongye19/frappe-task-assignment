(() => {
	const roles = frappe.boot?.user?.roles || [];
	if (!roles.some((role) => ["Teacher", "Student"].includes(role))) return;
	const is_teacher = roles.some((role) => ["Teacher", "System Manager"].includes(role));
	const current_language = (frappe.boot?.lang || frappe.boot?.user?.language || "en")
		.toLocaleLowerCase()
		.startsWith("zh")
		? "zh"
		: "en";

	const task_list_url = "/desk/school-task/view/list";
	const directory_list_roots = [
		"/desk/school-task",
		"/desk/school-project",
		"/desk/school-student",
	];
	const is_list_path = (root) => {
		const path = window.location.pathname.replace(/\/+$/, "");
		return path === root || path.startsWith(`${root}/view/list`);
	};
	const allowed_paths = ["/desk/school-task", "/desk/file"];
	if (is_teacher) {
		allowed_paths.push(
			"/desk/task-center",
			"/desk/school-project",
			"/desk/school-student"
		);
	}
	const is_allowed = (path) => allowed_paths.some((allowed) => path.startsWith(allowed));
	const guard_route = () => {
		const path = window.location.pathname.replace(/\/+$/, "");
		if (path.startsWith("/desk") && !is_allowed(path)) {
			window.location.replace(task_list_url);
			return true;
		}
		return false;
	};

	if (guard_route()) return;

	document.documentElement.classList.add("task-only-user");
	document.addEventListener(
		"click",
		(event) => {
			if (event.target.closest?.(".sidebar-header")) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}

			const link = event.target.closest?.("a");
			const path = link?.getAttribute("href") || "";
			if (!path.startsWith("/desk") || is_allowed(path)) return;

			event.preventDefault();
			event.stopImmediatePropagation();
			window.location.assign(task_list_url);
		},
		true
	);

	const keep_only_logout = () => {
		document.querySelectorAll(".frappe-menu.context-menu").forEach((menu) => {
			const items = [...menu.querySelectorAll(":scope > .dropdown-menu-item")];
			const labels = items.map((item) =>
				item.querySelector(".menu-item-title")?.textContent.trim()
			);
			if (labels.some((label) => ["桌面", "Desktop", "网站", "Website"].includes(label))) {
				menu.remove();
				return;
			}
			const logout = items.find((item) =>
				["注销", "Logout"].includes(item.querySelector(".menu-item-title")?.textContent.trim())
			);
			if (logout) items.forEach((item) => item !== logout && item.remove());
		});
	};
	const ensure_user_menu = () => {
		const sidebar_bottom = document.querySelector(".body-sidebar-bottom");
		const user_button = sidebar_bottom?.querySelector(".sidebar-user-button");
		if (!sidebar_bottom || !user_button) return;

		user_button.removeAttribute("onclick");
		user_button.setAttribute("aria-haspopup", "menu");

		let menu = sidebar_bottom.querySelector(".task-user-menu");
		if (!menu) {
			const display_name =
				frappe.boot?.user?.full_name ||
				frappe.boot?.user?.first_name ||
				frappe.session.user;
			const role = is_teacher ? __("Teacher") : __("Student");

			menu = document.createElement("div");
			menu.className = "task-user-menu";
			menu.hidden = true;
			menu.setAttribute("role", "menu");

			const heading = document.createElement("div");
			heading.className = "task-user-menu-heading";
			heading.textContent = __("Current account");

			const name = document.createElement("div");
			name.className = "task-user-menu-name";
			name.textContent = display_name;

			const email = document.createElement("div");
			email.className = "task-user-menu-email";
			email.textContent = frappe.session.user;

			const role_badge = document.createElement("span");
			role_badge.className = "task-user-role";
			role_badge.textContent = role;

			const divider = document.createElement("div");
			divider.className = "task-user-menu-divider";

			const logout = document.createElement("button");
			logout.type = "button";
			logout.className = "task-user-logout";
			logout.textContent = __("Log out");
			logout.setAttribute("role", "menuitem");
			logout.addEventListener("click", () => frappe.app.logout());

			menu.append(heading, name, email, role_badge, divider, logout);
			sidebar_bottom.prepend(menu);
		}

		if (user_button.dataset.taskUserMenuReady) return;
		user_button.dataset.taskUserMenuReady = "1";
		user_button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			menu.hidden = !menu.hidden;
			user_button.setAttribute("aria-expanded", String(!menu.hidden));
		});
	};
	const ensure_language_switcher = () => {
		const sidebar_bottom = document.querySelector(".body-sidebar-bottom");
		const user_button = sidebar_bottom?.querySelector(".sidebar-user-button");
		if (!sidebar_bottom || !user_button || sidebar_bottom.querySelector(".task-language-switcher")) {
			return;
		}

		const switcher = document.createElement("div");
		switcher.className = "task-language-switcher";
		switcher.setAttribute("role", "group");
		switcher.setAttribute("aria-label", __("Language"));

		[["zh", "中文"], ["en", "EN"]].forEach(([language, label]) => {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = label;
			button.classList.toggle("active", language === current_language);
			button.setAttribute("aria-pressed", String(language === current_language));
			button.addEventListener("click", async () => {
				if (language === current_language) return;
				switcher.querySelectorAll("button").forEach((item) => {
					item.disabled = true;
				});
				try {
					await frappe.call({
						method: "task_assignment.api.set_language",
						args: { language },
						freeze: true,
						freeze_message: __("Switching language…"),
					});
					window.location.reload();
				} catch (error) {
					switcher.querySelectorAll("button").forEach((item) => {
						item.disabled = false;
					});
					throw error;
				}
			});
			switcher.append(button);
		});

		sidebar_bottom.prepend(switcher);
	};
	const keep_only_task_list_actions = () => {
		const allowed = new Set([
			"Add Tags",
			"Archive",
			"Delete",
			__("Add Tags"),
			__("Archive"),
			__("Delete"),
		]);
		document
			.querySelectorAll(".actions-btn-group .dropdown-menu .dropdown-item")
			.forEach((item) => {
				const label =
					item.querySelector(".menu-item-label")?.textContent.trim() ||
					item.textContent.trim();
				if (!allowed.has(label)) item.closest("li")?.remove();
			});
	};
	const hide_teacher_only_navigation = () => {
		if (is_teacher) return;
		const sidebar = document.querySelector(".body-sidebar-top .sidebar-items");
		sidebar?.querySelectorAll(":scope > .sidebar-item-container").forEach((item) => {
			if (!item.querySelector('a[href^="/desk/school-task"]')) item.remove();
		});
		document
			.querySelectorAll(
				'a[href^="/desk/task-center"], a[href^="/desk/school-project"], a[href^="/desk/school-student"]'
			)
			.forEach((link) => {
				const item = link.closest(
					".standard-sidebar-item, .sidebar-item-container, .shortcut-widget-box"
				);
				(item || link).remove();
			});
	};
	const apply_unread_tasks = (payload = {}) => {
		const unread = new Set(payload.names || []);
		const count = Number(payload.count || 0);
		document
			.querySelectorAll('.body-sidebar-top a[href^="/desk/school-task"]')
			.forEach((link) => {
				link.classList.add("task-nav-link");
				let badge = link.querySelector(":scope > .task-unread-badge");
				if (!badge) {
					badge = document.createElement("span");
					badge.className = "task-unread-badge";
					link.append(badge);
				}
				badge.textContent = count > 99 ? "99+" : String(count);
				badge.hidden = count === 0;
				link.title = count ? __("{0} unread tasks", [count]) : "";
			});

		if (!is_list_path("/desk/school-task")) return;
		const result = [...document.querySelectorAll(".list-view .frappe-list .result")].find(
			(element) => element.offsetParent !== null
		);
		if (!result) return;
		const rows = [...result.querySelectorAll(":scope > .list-row-container")].filter(
			(row) => row.querySelector(".list-row-checkbox[data-name]")
		);
		rows.forEach((row) => {
			const name = row.querySelector(".list-row-checkbox[data-name]")?.dataset.name;
			row.classList.toggle("task-unread-row", unread.has(name));
		});
		rows
			.sort(
				(a, b) =>
					Number(b.classList.contains("task-unread-row")) -
					Number(a.classList.contains("task-unread-row"))
			)
			.forEach((row) => result.append(row));
	};
	let unread_request = null;
	const refresh_unread_tasks = () => {
		if (unread_request) return unread_request;
		unread_request = frappe.call({
			method: "task_assignment.task_assignment.doctype.school_task.school_task.get_unread_tasks",
		});
		unread_request.then((response) => apply_unread_tasks(response.message));
		unread_request.always(() => {
			unread_request = null;
		});
		return unread_request;
	};
	window.task_assignment_refresh_unread = refresh_unread_tasks;
	const ensure_teacher_navigation = () => {
		if (!is_teacher) return;
		const container = document.querySelector(".body-sidebar-top .sidebar-items");
		const seed = container?.querySelector(":scope > .sidebar-item-container");
		if (!container || !seed) return;

		const links = [
			["/desk/task-center", __("Task Center")],
			["/desk/school-task", __("Tasks")],
			["/desk/school-project", __("Projects")],
			["/desk/school-student", __("Students")],
		];
		links.forEach(([path, label]) => {
			if (container.querySelector(`a[href="${path}"]`)) return;
			const item = seed.cloneNode(true);
			item.setAttribute("item-name", label);
			item.setAttribute("data-id", label);
			item.setAttribute("data-original-title", label);
			item.querySelector(".standard-sidebar-item")?.classList.remove("active-sidebar");
			const link = item.querySelector("a");
			link.setAttribute("href", path);
			link.removeAttribute("title");
			link.classList.remove("task-nav-link");
			item.querySelector(".sidebar-item-label").textContent = label;
			item.querySelector(".task-unread-badge")?.remove();
			const edit = item.querySelector(".edit-menu");
			if (edit) edit.dataset.menu = label;
			container.append(item);
		});
	};
	const update_navigation_labels = () => {
		const container = document.querySelector(".body-sidebar-top .sidebar-items");
		if (!container) return;
		const labels = [
			["/desk/task-center", __("Task Center")],
			["/desk/school-task", __("Tasks")],
			["/desk/school-project", __("Projects")],
			["/desk/school-student", __("Students")],
		];
		labels.forEach(([path, label]) => {
			const link = container.querySelector(`a[href="${path}"]`);
			const item = link?.closest(".sidebar-item-container");
			if (!link || !item) return;
			item.setAttribute("item-name", label);
			item.setAttribute("data-id", label);
			item.setAttribute("data-original-title", label);
			const label_element = item.querySelector(".sidebar-item-label");
			if (label_element?.textContent !== label) label_element.textContent = label;
		});
	};
	const order_navigation = () => {
		if (!is_teacher) return;
		const container = document.querySelector(".body-sidebar-top .sidebar-items");
		if (!container) return;

		const paths = [
			"/desk/task-center",
			"/desk/school-task",
			"/desk/school-project",
			"/desk/school-student",
		];
		const items = [...container.querySelectorAll(":scope > .sidebar-item-container")];
		const ordered = paths
			.map((path) => items.find((item) => item.querySelector(`a[href=\"${path}\"]`)))
			.filter(Boolean);
		const current = items.filter((item) => ordered.includes(item));
		if (ordered.every((item, index) => current[index] === item)) return;

		[...ordered].reverse().forEach((item) => container.prepend(item));
	};
	const clear_search_highlights = (root) => {
		root.querySelectorAll("mark.task-search-highlight").forEach((mark) => {
			mark.replaceWith(document.createTextNode(mark.textContent || ""));
		});
		root.normalize();
	};
	const highlight_search_matches = (root, query) => {
		const matches = [];
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
				if (node.parentElement?.closest("mark, button, input, select, textarea")) {
					return NodeFilter.FILTER_REJECT;
				}
				return node.nodeValue.toLocaleLowerCase().includes(query)
					? NodeFilter.FILTER_ACCEPT
					: NodeFilter.FILTER_REJECT;
			},
		});
		while (walker.nextNode()) matches.push(walker.currentNode);

		matches.forEach((node) => {
			const text = node.nodeValue;
			const lower_text = text.toLocaleLowerCase();
			const fragment = document.createDocumentFragment();
			let start = 0;
			let index = lower_text.indexOf(query, start);
			while (index !== -1) {
				fragment.append(document.createTextNode(text.slice(start, index)));
				const mark = document.createElement("mark");
				mark.className = "task-search-highlight";
				mark.textContent = text.slice(index, index + query.length);
				fragment.append(mark);
				start = index + query.length;
				index = lower_text.indexOf(query, start);
			}
			fragment.append(document.createTextNode(text.slice(start)));
			node.replaceWith(fragment);
		});
	};
	const apply_list_search = (search) => {
		const result = search.closest(".list-view")?.querySelector(".frappe-list .result");
		if (!result) return;

		const query = search.querySelector("input").value.trim().toLocaleLowerCase();
		const rows = [...result.querySelectorAll(":scope > .list-row-container")].filter(
			(container) => container.querySelector(".list-row")
		);
		if (rows.every((row) => row.dataset.taskSearchQuery === query)) return;

		clear_search_highlights(result);
		let match_count = 0;
		rows.forEach((container) => {
			const searchable = container.querySelector(".list-row > .level-left");
			const matches =
				!query || searchable?.textContent.toLocaleLowerCase().includes(query);
			container.hidden = !matches;
			container.dataset.taskSearchQuery = query;
			if (matches) {
				match_count += 1;
				if (query && searchable) highlight_search_matches(searchable, query);
			}
		});

		let empty = result.querySelector(".task-search-empty");
		if (!empty) {
			empty = document.createElement("div");
			empty.className = "task-search-empty";
			result.append(empty);
		}
		empty.hidden = !query || match_count > 0;
		empty.textContent = query
			? __("No content contains “{0}”", [search.querySelector("input").value.trim()])
			: "";
	};
	const ensure_list_search = () => {
		const list_view = [...document.querySelectorAll(".list-view")].find(
			(view) => view.offsetParent !== null
		);
		const filter_section = list_view?.querySelector(".filter-section");
		const sort = filter_section?.querySelector(".sort-selector");
		if (!filter_section || !sort) return;

		let search = filter_section.querySelector(".task-list-search");
		if (!search) {
			search = document.createElement("div");
			search.className = "task-list-search";

			const icon = document.createElement("span");
			icon.className = "task-list-search-icon";
			icon.innerHTML = frappe.utils.icon("search", "sm");

			const input = document.createElement("input");
			input.type = "search";
			input.placeholder = __("Search this list");
			input.autocomplete = "off";
			input.setAttribute("aria-label", __("Search this list"));

			const clear = document.createElement("button");
			clear.type = "button";
			clear.className = "task-list-search-clear";
			clear.textContent = "×";
			clear.hidden = true;
			clear.setAttribute("aria-label", __("Clear search"));

			input.addEventListener("input", () => {
				clear.hidden = !input.value;
				apply_list_search(search);
			});
			input.addEventListener("keydown", (event) => {
				if (event.key !== "Escape" || !input.value) return;
				input.value = "";
				clear.hidden = true;
				apply_list_search(search);
			});
			clear.addEventListener("click", () => {
				input.value = "";
				clear.hidden = true;
				apply_list_search(search);
				input.focus();
			});

			search.append(icon, input, clear);
			filter_section.insertBefore(search, sort);
		}
		apply_list_search(search);
	};
	const simplify_ui = () => {
		const is_directory_list = directory_list_roots.some(is_list_path);
		document.documentElement.classList.toggle("directory-list-page", is_directory_list);
		document.documentElement.classList.toggle(
			"school-task-list-page",
			is_list_path("/desk/school-task")
		);
		keep_only_logout();
		keep_only_task_list_actions();
		hide_teacher_only_navigation();
		ensure_teacher_navigation();
		update_navigation_labels();
		order_navigation();
		ensure_language_switcher();
		ensure_user_menu();
		if (is_directory_list) ensure_list_search();
		document.querySelector(".body-sidebar-container")?.classList.add("expanded");
	};
	document.addEventListener("click", (event) => {
		const menu = document.querySelector(".task-user-menu");
		if (!menu || menu.hidden || event.target.closest(".body-sidebar-bottom")) return;
		menu.hidden = true;
		document
			.querySelector(".sidebar-user-button")
			?.setAttribute("aria-expanded", "false");
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		const menu = document.querySelector(".task-user-menu");
		if (!menu || menu.hidden) return;
		menu.hidden = true;
		document
			.querySelector(".sidebar-user-button")
			?.setAttribute("aria-expanded", "false");
	});

	const observer = new MutationObserver(simplify_ui);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	simplify_ui();
	setTimeout(refresh_unread_tasks, 0);

	$(document).on("app_ready", () => {
		frappe.router.on("change", () => {
			setTimeout(() => {
				if (!guard_route()) {
					simplify_ui();
					refresh_unread_tasks();
				}
			}, 100);
		});
	});
})();

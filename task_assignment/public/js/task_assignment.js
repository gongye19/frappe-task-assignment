(() => {
	const roles = frappe.boot?.user?.roles || [];
	if (!roles.some((role) => ["Teacher", "Student"].includes(role))) return;
	const is_teacher = roles.some((role) => ["Teacher", "System Manager"].includes(role));
	let current_language = (frappe.boot?.lang || frappe.boot?.user?.language || "en")
		.toLocaleLowerCase()
		.startsWith("zh")
		? "zh"
		: "en";
	const language_messages = {
		en: {},
		zh: current_language === "zh" ? { ...(frappe._messages || {}) } : null,
	};
	const language_message_requests = {};
	const client_chinese_labels = {
		Task: "任务",
		"Add Task": "添加任务",
		Save: "保存",
	};
	const client_english_labels = {
		"School Task": "Task",
		"School Tasks": "Tasks",
		"Add School Task": "Add Task",
		"任务": "Task",
		"添加任务": "Add Task",
	};
	let desired_language = current_language;
	let language_switch_sequence = 0;
	let language_persist_timer = null;
	let language_persist_chain = Promise.resolve();
	const preferred_english_labels = [
		"Task Assignment",
		"Task Center",
		"Tasks",
		"Projects",
		"Students",
		"School Task",
		"School Project",
		"School Student",
		"Add School Task",
		"Add School Project",
		"Add School Student",
		"Task Title",
		"Project",
		"Assigned Student",
		"Due Date",
		"Status",
		"ID",
		"Published",
		"Instructions",
		"Task Attachment",
		"Student Submission",
		"Submission Note",
		"Submission File",
		"Teacher Review",
		"Teacher Feedback",
		"Assigned By",
		"Project Name",
		"Project Description",
		"Student Name",
		"Student Account",
		"Class",
		"To Do",
		"Submitted",
		"Completed",
		"Archived",
		"Active",
		"Enrolled",
		"Disabled",
		"Draft",
		"Save",
		"Publish",
		"Actions",
		"Add Tags",
		"Archive",
		"Delete",
		"Search this list",
		"Clear search",
		"Last Updated On",
		"Back to tasks",
		"Back to projects",
		"Back to students",
	];

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
			const current_menu = sidebar_bottom.querySelector(".task-user-menu");
			if (!current_menu) return;
			current_menu.hidden = !current_menu.hidden;
			user_button.setAttribute("aria-expanded", String(!current_menu.hidden));
		});
	};
	const load_language_messages = async (language) => {
		if (language_messages[language]) return language_messages[language];
		if (!language_message_requests[language]) {
			language_message_requests[language] = Promise.resolve(
				frappe.call({
					method: "task_assignment.api.get_language_messages",
					args: { language },
				})
			)
				.then((response) => {
					language_messages[language] = response.message || {};
					return language_messages[language];
				})
				.finally(() => delete language_message_requests[language]);
		}
		return language_message_requests[language];
	};
	const get_language_dictionary = (language) => {
		const chinese_messages = {
			...(language_messages.zh || {}),
			...client_chinese_labels,
		};
		if (language === "zh") return chinese_messages;
		const english_messages = {};
		Object.entries(chinese_messages).forEach(([english, chinese]) => {
			if (!english_messages[chinese]) english_messages[chinese] = english;
		});
		preferred_english_labels.forEach((english) => {
			const chinese = chinese_messages[english];
			if (chinese) english_messages[chinese] = english;
		});
		return { ...english_messages, ...client_english_labels };
	};
	const translate_ui_value = (value, dictionary) => {
		const trimmed = value?.trim();
		if (!trimmed) return value;
		let translated = dictionary[trimmed];
		if (!translated) {
			const count_label = trimmed.match(/^(.+?)(\s*·\s*\d+)$/);
			if (count_label && dictionary[count_label[1]]) {
				translated = `${dictionary[count_label[1]]}${count_label[2]}`;
			}
		}
		if (!translated) {
			const colon_label = trimmed.match(/^([^:：]+)([:：]\s*.*)$/);
			if (colon_label && dictionary[colon_label[1]]) {
				translated = `${dictionary[colon_label[1]]}${colon_label[2]}`;
			}
		}
		if (!translated) {
			const english_sort_label = trimmed.match(/^Click to sort by (.+)$/);
			if (english_sort_label && dictionary[english_sort_label[1]]) {
				translated = `点击按${dictionary[english_sort_label[1]]}排序`;
			}
		}
		if (!translated) {
			const chinese_sort_label = trimmed.match(/^点击按(.+)排序$/);
			if (chinese_sort_label && dictionary[chinese_sort_label[1]]) {
				translated = `Click to sort by ${dictionary[chinese_sort_label[1]]}`;
			}
		}
		return translated ? value.replace(trimmed, translated) : value;
	};
	const translate_visible_ui = (language) => {
		const dictionary = get_language_dictionary(language);
		if (!Object.keys(dictionary).length) return;
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
				if (
					node.parentElement?.closest(
						"script, style, input, textarea, .task-language-toggle, .task-user-menu-name, .task-user-menu-email"
					)
				) {
					return NodeFilter.FILTER_REJECT;
				}
				const list_column = node.parentElement?.closest(".list-row-col");
				if (
					list_column &&
					!list_column.closest(".list-row-head") &&
					!node.parentElement.closest(".indicator-pill")
				) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		const nodes = [];
		while (walker.nextNode()) nodes.push(walker.currentNode);
		nodes.forEach((node) => {
			node.nodeValue = translate_ui_value(node.nodeValue, dictionary);
		});
		document.querySelectorAll("button.primary-action[data-label]").forEach((button) => {
			const label = decodeURIComponent(button.dataset.label || "");
			const translated = translate_ui_value(label, dictionary);
			if (translated === label) return;
			button.dataset.label = translated;
			const label_container = button.querySelector(":scope > span") || button;
			label_container.textContent = translated;
		});
		document
			.querySelectorAll("[placeholder], [aria-label], [title], [data-original-title]")
			.forEach((element) => {
				["placeholder", "aria-label", "title", "data-original-title"].forEach(
					(attribute) => {
						if (!element.hasAttribute(attribute)) return;
						const value = element.getAttribute(attribute);
						element.setAttribute(attribute, translate_ui_value(value, dictionary));
					}
				);
			});
	};
	const apply_client_language = (language, messages) => {
		current_language = language;
		desired_language = language;
		frappe._messages = language === "en" ? {} : messages || {};
		frappe.boot.lang = language;
		if (frappe.boot.user) frappe.boot.user.language = language;
		document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
		document.cookie = `preferred_language=${language}; path=/; SameSite=Lax`;
		document.querySelectorAll(".task-user-menu").forEach((menu) => menu.remove());
		translate_visible_ui(language);
		simplify_ui();
	};
	const schedule_language_persist = () => {
		window.clearTimeout(language_persist_timer);
		language_persist_timer = window.setTimeout(() => {
			const language_to_save = current_language;
			language_persist_chain = language_persist_chain
				.catch(() => {})
				.then(() =>
					frappe.call({
						method: "task_assignment.api.set_language",
						args: { language: language_to_save },
					})
				)
				.catch(() => {
					if (current_language !== language_to_save) return;
					frappe.show_alert({
						message: __("Unable to switch language. Please try again."),
						indicator: "red",
					});
				});
		}, 500);
	};
	const switch_language = async (button) => {
		desired_language = desired_language === "en" ? "zh" : "en";
		const target_language = desired_language;
		const switch_sequence = ++language_switch_sequence;
		button.classList.add("is-switching");
		button.setAttribute("aria-busy", "true");
		try {
			const messages = await load_language_messages(target_language);
			if (switch_sequence !== language_switch_sequence) return;
			apply_client_language(target_language, messages);
			schedule_language_persist();
		} catch (error) {
			if (switch_sequence !== language_switch_sequence) return;
			desired_language = current_language;
			frappe.show_alert({
				message: __("Unable to switch language. Please try again."),
				indicator: "red",
			});
		} finally {
			if (switch_sequence === language_switch_sequence) {
				button.classList.remove("is-switching");
				button.removeAttribute("aria-busy");
				ensure_language_toggle();
			}
		}
	};
	const ensure_language_toggle = () => {
		const active_head = [...document.querySelectorAll(".page-head")].find(
			(head) => head.offsetParent !== null
		);
		const page_actions = active_head?.querySelector(".page-actions");
		document
			.querySelectorAll(".task-language-switcher")
			.forEach((item) => item.remove());
		document.querySelectorAll(".task-language-toggle").forEach((item) => {
			if (!active_head?.contains(item)) item.remove();
		});
		if (!page_actions) return;

		let button = page_actions.querySelector(".task-language-toggle");
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.className = "btn btn-default btn-sm task-language-toggle";
			button.addEventListener("click", () => switch_language(button));
		}
		const anchor =
			page_actions.querySelector(":scope > .custom-actions") ||
			page_actions.querySelector(":scope > .standard-actions");
		if (anchor && button.nextElementSibling !== anchor) {
			page_actions.insertBefore(button, anchor);
		} else if (!anchor && button.parentElement !== page_actions) {
			page_actions.append(button);
		}
		button.textContent = current_language === "en" ? "中文" : "English";
		button.setAttribute("aria-label", __("Switch language"));
		button.title = __("Switch language");
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
	let unread_count = 0;
	const apply_unread_tasks = (payload = {}) => {
		const unread = new Set(payload.names || []);
		const count = Number(payload.count || 0);
		unread_count = count;
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
	const navigation_items = () => {
		const items = [
			{ path: "/desk/school-task", label: __("Tasks"), icon: "list-checks" },
		];
		if (!is_teacher) return items;
		return [
			{ path: "/desk/task-center", label: __("Task Center"), icon: "dashboard" },
			...items,
			{ path: "/desk/school-project", label: __("Projects"), icon: "folder" },
			{ path: "/desk/school-student", label: __("Students"), icon: "users" },
		];
	};
	const is_active_navigation_path = (path) => {
		const current_path = window.location.pathname.replace(/\/+$/, "");
		return current_path === path || current_path.startsWith(`${path}/`);
	};
	const create_navigation_item = ({ path, label, icon }) => {
		const item = document.createElement("div");
		item.className = "sidebar-item-container task-managed-nav-item";
		item.setAttribute("item-name", label);
		item.setAttribute("data-id", path);
		item.setAttribute("title", label);

		const standard = document.createElement("div");
		standard.className = "standard-sidebar-item";
		standard.classList.toggle("active-sidebar", is_active_navigation_path(path));

		const link = document.createElement("a");
		link.className = "item-anchor";
		link.href = path;
		if (is_active_navigation_path(path)) link.setAttribute("aria-current", "page");

		const icon_container = document.createElement("span");
		icon_container.className = "sidebar-item-icon text-ink-gray-7";
		icon_container.setAttribute("item-icon", icon);
		icon_container.innerHTML = frappe.utils.icon(
			icon,
			"sm",
			"",
			"",
			"text-ink-gray-7 current-color",
			true
		);

		const text = document.createElement("span");
		text.className = "sidebar-item-label";
		text.textContent = label;
		link.append(icon_container, text);

		if (path === "/desk/school-task") {
			link.classList.add("task-nav-link");
			const badge = document.createElement("span");
			badge.className = "task-unread-badge";
			badge.textContent = unread_count > 99 ? "99+" : String(unread_count);
			badge.hidden = unread_count === 0;
			link.append(badge);
		}

		const control = document.createElement("div");
		control.className = "sidebar-item-control";
		link.append(control);
		standard.append(link);
		item.append(standard);
		return item;
	};
	const ensure_stable_navigation = () => {
		const container = document.querySelector(".body-sidebar-top .sidebar-items");
		if (!container) return;
		const items = navigation_items();
		const signature = JSON.stringify({
			language: current_language,
			role: is_teacher ? "teacher" : "student",
			paths: items.map((item) => item.path),
		});
		const managed_items = container.querySelectorAll(":scope > .task-managed-nav-item");
		if (
			container.dataset.taskNavigationSignature !== signature ||
			managed_items.length !== items.length ||
			managed_items.length !== container.children.length
		) {
			container.replaceChildren(...items.map(create_navigation_item));
			container.dataset.taskNavigationSignature = signature;
			return;
		}

		managed_items.forEach((item) => {
			const link = item.querySelector("a");
			const active = is_active_navigation_path(link.getAttribute("href"));
			item.querySelector(".standard-sidebar-item")?.classList.toggle("active-sidebar", active);
			if (active) link.setAttribute("aria-current", "page");
			else link.removeAttribute("aria-current");
		});
	};
	const ensure_stable_sidebar_header = () => {
		const header = document.querySelector(".sidebar-header");
		if (!header) return;
		header.classList.add("task-stable-sidebar-header");
		const title = header.querySelector(".header-title");
		const subtitle = header.querySelector(".header-subtitle");
		const logo = header.querySelector(".header-logo");
		const app_title = __("Task Assignment");
		if (title?.textContent.trim() !== app_title) title.textContent = app_title;
		if (subtitle?.textContent.trim() !== frappe.session.user) {
			subtitle.textContent = frappe.session.user;
		}
		if (logo && !logo.querySelector(".task-stable-app-logo")) {
			logo.replaceChildren();
			const image = document.createElement("img");
			image.className = "task-stable-app-logo";
			image.src = "/assets/task_assignment/task.svg";
			image.alt = "";
			logo.append(image);
		}
	};
	const form_back_routes = {
		"School Task": { path: "/desk/school-task/view/list", label: "Back to tasks" },
		"School Project": {
			path: "/desk/school-project/view/list",
			label: "Back to projects",
		},
		"School Student": {
			path: "/desk/school-student/view/list",
			label: "Back to students",
		},
	};
	const ensure_form_back_button = () => {
		const route = frappe.get_route?.() || [];
		const config = route[0] === "Form" ? form_back_routes[route[1]] : null;
		const active_head = [...document.querySelectorAll(".page-head")].find(
			(head) => head.offsetParent !== null
		);
		document.querySelectorAll(".task-back-button").forEach((button) => {
			if (!config || !active_head?.contains(button)) button.remove();
		});
		if (!config || !active_head) return;

		const page_title = active_head.querySelector(".page-title");
		const title_area = page_title?.querySelector(".title-area");
		if (!page_title || !title_area) return;
		let button = page_title.querySelector(".task-back-button");
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.className = "btn btn-default btn-sm task-back-button";
			button.addEventListener("click", () => {
				const destination = button.dataset.destination;
				if (destination) frappe.set_route(destination);
			});
			const icon = document.createElement("span");
			icon.className = "task-back-button-icon";
			icon.innerHTML = frappe.utils.icon("arrow-left", "sm");
			const label = document.createElement("span");
			label.className = "task-back-button-label";
			button.append(icon, label);
			page_title.insertBefore(button, title_area);
		}
		button.dataset.destination = config.path;
		button.querySelector(".task-back-button-label").textContent = __(config.label);
		button.setAttribute("aria-label", __(config.label));
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
		ensure_stable_sidebar_header();
		ensure_stable_navigation();
		ensure_language_toggle();
		ensure_user_menu();
		ensure_form_back_button();
		if (is_directory_list) ensure_list_search();
		// Frappe can recreate native controls after a route or form refresh.
		// Keep those controls in the selected language without reloading the page.
		translate_visible_ui(current_language);
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

	let simplify_scheduled = false;
	const schedule_simplify_ui = () => {
		if (simplify_scheduled) return;
		simplify_scheduled = true;
		window.requestAnimationFrame(() => {
			simplify_scheduled = false;
			simplify_ui();
		});
	};
	const observer = new MutationObserver(schedule_simplify_ui);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	simplify_ui();
	setTimeout(refresh_unread_tasks, 0);
	setTimeout(
		() => load_language_messages(current_language === "en" ? "zh" : "en").catch(() => {}),
		0
	);

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

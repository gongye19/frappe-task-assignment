(() => {
	if (!window.location.pathname.startsWith("/login")) return;

	const translations = {
		Login: "登录",
		"Sign In": "登录",
		"Welcome! Please sign in to continue.": "欢迎，请登录后继续。",
		Email: "邮箱",
		Password: "密码",
		"Forgot password?": "忘记密码？",
		Continue: "继续",
		"Sign Up": "注册",
		"Let's setup your account.": "开始设置你的账号。",
		"Signups have been disabled": "注册已禁用",
		"Signups have been disabled for this website.": "此网站已禁用注册功能",
		"Forgot Password?": "忘记密码？",
		"Send Link": "发送链接",
		"Back to sign in": "返回登录",
		"Login with password": "使用密码登录",
		"Login with Email Link": "使用邮箱链接登录",
		Powered: "基于",
	};
	const english_by_chinese = Object.fromEntries(
		Object.entries(translations).map(([english, chinese]) => [chinese, english])
	);
	english_by_chinese["登录"] = "Sign In";

	const get_cookie = (name) =>
		document.cookie
			.split(";")
			.map((item) => item.trim().split("="))
			.find(([key]) => key === name)?.[1];
	let current_language = decodeURIComponent(get_cookie("preferred_language") || "en")
		.toLocaleLowerCase()
		.startsWith("zh")
		? "zh"
		: "en";

	const translate_page = () => {
		document.documentElement.lang = current_language === "zh" ? "zh-CN" : "en";
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
				if (node.parentElement?.closest(".login-language-toggle")) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		const nodes = [];
		while (walker.nextNode()) nodes.push(walker.currentNode);
		nodes.forEach((node) => {
			const value = node.nodeValue.trim();
			const replacement =
				current_language === "zh" ? translations[value] : english_by_chinese[value];
			if (replacement) node.nodeValue = node.nodeValue.replace(value, replacement);
		});

		const button = document.querySelector(".login-language-toggle");
		if (button) {
			button.textContent = current_language === "en" ? "中文" : "English";
			button.setAttribute(
				"aria-label",
				current_language === "en" ? "Switch to Chinese" : "切换到英文"
			);
		}
	};

	const ensure_toggle = () => {
		const card = document.querySelector(".login-content.page-card");
		if (!card) return;
		card.querySelectorAll(".login-language-switcher").forEach((item) => item.remove());
		let button = card.querySelector(".login-language-toggle");
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.className = "login-language-toggle";
			button.addEventListener("click", () => {
				current_language = current_language === "en" ? "zh" : "en";
				document.cookie = `preferred_language=${current_language}; path=/; SameSite=Lax`;
				translate_page();
			});
			card.prepend(button);
		}
		translate_page();
	};

	let update_scheduled = false;
	const observer = new MutationObserver(() => {
		if (update_scheduled) return;
		update_scheduled = true;
		window.requestAnimationFrame(() => {
			update_scheduled = false;
			ensure_toggle();
		});
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });
	ensure_toggle();
})();

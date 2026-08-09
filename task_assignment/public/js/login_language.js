(() => {
	if (!window.location.pathname.startsWith("/login")) return;

	const get_cookie = (name) =>
		document.cookie
			.split(";")
			.map((item) => item.trim().split("="))
			.find(([key]) => key === name)?.[1];

	const ensure_switcher = () => {
		const card = document.querySelector(".login-content.page-card");
		if (!card || card.querySelector(".login-language-switcher")) return;

		const document_language = document.documentElement.lang || "en";
		const current = decodeURIComponent(get_cookie("preferred_language") || document_language)
			.toLocaleLowerCase()
			.startsWith("zh")
			? "zh"
			: "en";
		const switcher = document.createElement("div");
		switcher.className = "login-language-switcher";
		switcher.setAttribute("role", "group");
		switcher.setAttribute("aria-label", current === "zh" ? "语言" : "Language");

		[["zh", "中文"], ["en", "EN"]].forEach(([language, label]) => {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = label;
			button.classList.toggle("active", language === current);
			button.setAttribute("aria-pressed", String(language === current));
			button.addEventListener("click", () => {
				if (language === current) return;
				document.cookie = `preferred_language=${language}; path=/; SameSite=Lax`;
				window.location.reload();
			});
			switcher.append(button);
		});

		card.prepend(switcher);
	};

	const observer = new MutationObserver(ensure_switcher);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	ensure_switcher();
})();

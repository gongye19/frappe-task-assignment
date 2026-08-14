(() => {
	const add_link = (rel, href, sizes) => {
		if (document.head.querySelector(`link[rel="${rel}"]`)) return;
		const link = document.createElement("link");
		link.rel = rel;
		link.href = href;
		if (sizes) link.sizes = sizes;
		document.head.append(link);
	};

	add_link("manifest", "/assets/task_assignment/manifest.json");
	add_link("apple-touch-icon", "/assets/task_assignment/icons/task-192.png", "192x192");
	document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#2563eb");

	if ("serviceWorker" in navigator) {
		window.addEventListener(
			"load",
			() => navigator.serviceWorker.register("/task-pwa.min.js", { scope: "/" }).catch(() => {}),
			{ once: true }
		);
	}
})();

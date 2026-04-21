import { createServerFn } from "@tanstack/react-start";

export const getRootLayoutData = createServerFn({ method: "GET" }).handler(
	async () => {
		const [{ getRequestHeaders }, { getAppSessionData }] = await Promise.all([
			import("@tanstack/react-start/server"),
			import("./auth.server"),
		]);

		return getAppSessionData(getRequestHeaders());
	}
);

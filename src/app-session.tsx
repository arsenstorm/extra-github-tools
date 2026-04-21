"use client";

import { createContext, useContext } from "react";
import type { AppSessionData } from "./auth.server";

const defaultAppSessionData: AppSessionData = {
	github: null,
	githubClientId: null,
	session: null,
};

const AppSessionContext = createContext<AppSessionData>(defaultAppSessionData);

export function AppSessionProvider({
	children,
	value,
}: Readonly<{
	children: React.ReactNode;
	value: AppSessionData;
}>) {
	return (
		<AppSessionContext.Provider value={value}>
			{children}
		</AppSessionContext.Provider>
	);
}

export const useAppSession = (): AppSessionData =>
	useContext(AppSessionContext);

import { ClientOnly } from "@tanstack/react-router";
import { Suspense, use, useEffect, useState } from "react";

function Resolved<Data>({
	children,
	promise,
}: Readonly<{
	children: (data: Data) => React.ReactNode;
	promise: Promise<Data>;
}>) {
	const [settled, setSettled] = useState<{
		data: Data;
		promise: Promise<Data>;
	} | null>(null);

	// After the first value, a new promise (a refresh, or the router handing
	// back a resolved copy) updates in place instead of suspending again, so
	// the rendered children keep their state.
	useEffect(() => {
		let isCurrent = true;

		promise
			.then((data) => {
				if (isCurrent) {
					setSettled({ data, promise });
				}
			})
			.catch(() => {
				// The suspended render below surfaces the rejection.
			});

		return () => {
			isCurrent = false;
		};
	}, [promise]);

	return <>{children(settled ? settled.data : use(promise))}</>;
}

/**
 * Renders `fallback` during SSR and until `promise` first settles on the
 * client, then renders `children` with the value. Later promises refresh the
 * value without showing the fallback; change `key` to start over.
 *
 * Deferred loader data is resolved here instead of through a streamed
 * Suspense boundary, which this app's HTML stream does not complete reliably.
 * The shell and fallback are still server-rendered, so the page paints
 * immediately and the data fills in as soon as it arrives.
 */
export function Deferred<Data>({
	children,
	fallback,
	promise,
}: Readonly<{
	children: (data: Data) => React.ReactNode;
	fallback: React.ReactNode;
	promise: Promise<Data>;
}>) {
	return (
		<ClientOnly fallback={fallback}>
			<Suspense fallback={fallback}>
				<Resolved promise={promise}>{children}</Resolved>
			</Suspense>
		</ClientOnly>
	);
}

/**
 * The latest value of `promise`, or null until the first one settles. A new
 * promise keeps the previous value until it resolves, so the UI never blanks
 * during a refresh. Rejections leave the last value in place.
 */
export function useResolvedValue<Data>(
	promise: Promise<Data> | null
): Data | null {
	const [value, setValue] = useState<Data | null>(null);

	useEffect(() => {
		if (!promise) {
			setValue(null);
			return;
		}

		let isCurrent = true;

		promise
			.then((data) => {
				if (isCurrent) {
					setValue(data);
				}
			})
			.catch(() => {
				// Keep the last known value.
			});

		return () => {
			isCurrent = false;
		};
	}, [promise]);

	return value;
}

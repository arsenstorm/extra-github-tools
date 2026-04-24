import { Text } from "@/components/ui/text";

export function OverviewMetric({
	className,
	isLast = false,
	label,
	tone = "default",
	value,
}: Readonly<{
	className?: string;
	isLast?: boolean;
	label: string;
	tone?: "default" | "negative" | "positive";
	value: number;
}>) {
	let valueClassName = "mt-2 font-bold text-3xl";
	let valuePrefix = "";

	if (tone === "positive") {
		valueClassName =
			"mt-2 font-bold text-3xl text-emerald-600 dark:text-emerald-400";
		valuePrefix = "+";
	} else if (tone === "negative") {
		valueClassName = "mt-2 font-bold text-3xl text-red-600 dark:text-red-400";
		valuePrefix = "-";
	}

	return (
		<div
			className={[
				"border-zinc-200 border-b p-6 dark:border-zinc-800",
				isLast ? "" : "border-r",
				className ?? "",
			]
				.join(" ")
				.trim()}
		>
			<Text className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
				{label}
			</Text>
			<Text className={valueClassName}>
				{valuePrefix}
				{value.toLocaleString()}
			</Text>
		</div>
	);
}

import clsx from "clsx";
import { Text } from "@/components/ui/text";

type MetricTone = "default" | "negative" | "positive";

const TONE_STYLES: Record<MetricTone, { className?: string; prefix: string }> =
	{
		default: { prefix: "" },
		negative: { className: "text-red-600 dark:text-red-400", prefix: "-" },
		positive: {
			className: "text-emerald-600 dark:text-emerald-400",
			prefix: "+",
		},
	};

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
	tone?: MetricTone;
	value: number;
}>) {
	const toneStyle = TONE_STYLES[tone];

	return (
		<div
			className={clsx(
				"border-zinc-200 border-b p-6 dark:border-zinc-800",
				!isLast && "border-r",
				className
			)}
		>
			<Text className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
				{label}
			</Text>
			<Text className={clsx("mt-2 font-bold text-3xl", toneStyle.className)}>
				{toneStyle.prefix}
				{value.toLocaleString()}
			</Text>
		</div>
	);
}

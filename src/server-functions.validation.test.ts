import { describe, expect, it } from "vitest";
import type {
	FameSearchInput,
	TransferRepositoriesInput,
	TransferSearchInput,
} from "./server-functions";
import {
	validateFameSearchInput,
	validateTransferRepositoriesInput,
	validateTransferSearchInput,
} from "./server-functions.validation";

const asTransferInput = (value: unknown): TransferRepositoriesInput =>
	value as TransferRepositoriesInput;

const emptyTransferInput: TransferRepositoriesInput = {
	archiveState: "current",
	from: "",
	namePrefix: "",
	nameSuffix: "",
	repositories: [],
	to: "",
	visibility: "current",
};

describe("validateTransferRepositoriesInput", () => {
	it("trims and dedupes repository names", () => {
		expect(
			validateTransferRepositoriesInput({
				from: " src ",
				repositories: [" a ", "b", "a", "", "  "],
				to: " dst ",
			})
		).toEqual({
			archiveState: "current",
			from: "src",
			namePrefix: "",
			nameSuffix: "",
			repositories: ["a", "b"],
			to: "dst",
			visibility: "current",
		});
	});

	it("treats non-string fields as empty", () => {
		expect(
			validateTransferRepositoriesInput(
				asTransferInput({
					from: 42,
					namePrefix: {},
					nameSuffix: [],
					repositories: "nope",
					to: null,
				})
			)
		).toEqual(emptyTransferInput);
	});

	it("drops non-string repository entries", () => {
		expect(
			validateTransferRepositoriesInput(
				asTransferInput({
					from: "src",
					repositories: ["ok", 1, null, undefined, "also"],
					to: "dst",
				})
			).repositories
		).toEqual(["ok", "also"]);
	});

	it("falls back to current for unknown archive state and visibility", () => {
		const result = validateTransferRepositoriesInput(
			asTransferInput({
				archiveState: "banana",
				from: "src",
				repositories: [],
				to: "dst",
				visibility: "hidden",
			})
		);

		expect(result.archiveState).toBe("current");
		expect(result.visibility).toBe("current");
	});

	it("keeps valid archive state and visibility", () => {
		const result = validateTransferRepositoriesInput({
			archiveState: "archived",
			from: "src",
			repositories: [],
			to: "dst",
			visibility: "private",
		});

		expect(result.archiveState).toBe("archived");
		expect(result.visibility).toBe("private");
	});

	it("does not throw on null or non-object input", () => {
		expect(validateTransferRepositoriesInput(asTransferInput(null))).toEqual(
			emptyTransferInput
		);
		expect(
			validateTransferRepositoriesInput(asTransferInput("string"))
		).toEqual(emptyTransferInput);
	});
});

describe("validateTransferSearchInput", () => {
	it("trims and drops blank values", () => {
		expect(validateTransferSearchInput({ from: " a ", to: "  " })).toEqual({
			from: "a",
			to: undefined,
		});
	});

	it("ignores non-string values", () => {
		expect(
			validateTransferSearchInput({
				from: 1,
				to: {},
			} as unknown as TransferSearchInput)
		).toEqual({ from: undefined, to: undefined });
	});
});

describe("validateFameSearchInput", () => {
	it("trims and drops blank values", () => {
		expect(
			validateFameSearchInput({
				org: " org ",
				repo: 3,
			} as unknown as FameSearchInput)
		).toEqual({ org: "org", repo: undefined });
	});
});

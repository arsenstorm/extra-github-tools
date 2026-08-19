import { describe, expect, it } from "vitest";
import type {
	FameSearchInput,
	ManageRepositoriesInput,
	ManageSearchInput,
	TransferRepositoriesInput,
	TransferSearchInput,
} from "./server-functions";
import {
	validateFameSearchInput,
	validateManageRepositoriesInput,
	validateManageSearchInput,
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

const asManageInput = (value: unknown): ManageRepositoriesInput =>
	value as ManageRepositoriesInput;

const emptyManageInput: ManageRepositoriesInput = {
	account: "",
	archiveAction: "current",
	repositories: [],
	subscriptionAction: "current",
	visibilityAction: "current",
};

describe("validateManageRepositoriesInput", () => {
	it("trims account and dedupes repository names", () => {
		expect(
			validateManageRepositoriesInput({
				account: " acme ",
				repositories: [" a ", "b", "a", "", "  "],
			})
		).toEqual({
			account: "acme",
			archiveAction: "current",
			repositories: ["a", "b"],
			subscriptionAction: "current",
			visibilityAction: "current",
		});
	});

	it("treats non-string fields as empty", () => {
		expect(
			validateManageRepositoriesInput(
				asManageInput({
					account: 42,
					repositories: "nope",
				})
			)
		).toEqual(emptyManageInput);
	});

	it("drops non-string repository entries", () => {
		expect(
			validateManageRepositoriesInput(
				asManageInput({
					account: "acme",
					repositories: ["ok", 1, null, undefined, "also"],
				})
			).repositories
		).toEqual(["ok", "also"]);
	});

	it("falls back to current for unknown action values", () => {
		const result = validateManageRepositoriesInput(
			asManageInput({
				account: "acme",
				archiveAction: "banana",
				repositories: [],
				subscriptionAction: "banana",
				visibilityAction: "banana",
			})
		);

		expect(result.archiveAction).toBe("current");
		expect(result.subscriptionAction).toBe("current");
		expect(result.visibilityAction).toBe("current");
	});

	it("keeps valid action values", () => {
		const result = validateManageRepositoriesInput({
			account: "acme",
			archiveAction: "archived",
			repositories: [],
			subscriptionAction: "ignoring",
			visibilityAction: "internal",
		});

		expect(result.archiveAction).toBe("archived");
		expect(result.subscriptionAction).toBe("ignoring");
		expect(result.visibilityAction).toBe("internal");
	});

	it("does not throw on null or non-object input", () => {
		expect(validateManageRepositoriesInput(asManageInput(null))).toEqual(
			emptyManageInput
		);
		expect(validateManageRepositoriesInput(asManageInput("string"))).toEqual(
			emptyManageInput
		);
	});
});

describe("validateManageSearchInput", () => {
	it("trims and drops blank values", () => {
		expect(validateManageSearchInput({ account: " acme " })).toEqual({
			account: "acme",
		});
	});

	it("ignores non-string values", () => {
		expect(
			validateManageSearchInput({
				account: 1,
			} as unknown as ManageSearchInput)
		).toEqual({ account: undefined });
	});

	it("does not throw on non-object input", () => {
		expect(
			validateManageSearchInput(null as unknown as ManageSearchInput)
		).toEqual({ account: undefined });
	});
});

interface FeatureFlag {
	enabled: boolean;
}

export const CONFIG: {
	bulkManageRepositories: FeatureFlag;
	bulkTransferRepositories: FeatureFlag;
	commitFame: FeatureFlag;
} = {
	bulkManageRepositories: {
		enabled: true,
	},
	bulkTransferRepositories: {
		enabled: true,
	},
	commitFame: {
		enabled: false,
	},
};

interface FeatureFlag {
	enabled: boolean;
}

export const CONFIG: {
	bulkTransferRepositories: FeatureFlag;
	commitFame: FeatureFlag;
} = {
	bulkTransferRepositories: {
		enabled: true,
	},
	commitFame: {
		enabled: false,
	},
};

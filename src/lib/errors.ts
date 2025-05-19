export class OErrors {
	message(): string {
		throw new Error("Must be implemented");
	}
}

export class OErrorFileNoOwner extends OErrors {
	public readonly filePath: string;
	constructor(root: string, filePath: string) {
		super();
		this.filePath = filePath.replace(root, ".");
	}
	message(): string {
		return this.filePath + " has no owner";
	}
}

export class OErrorNothingToTest extends OErrors {
	message(): string {
		return "Nothing to test";
	}
}

const validations = {
	hasNullInput: (pessoa) => {
		if (!pessoa.nome || !pessoa.apelido || !pessoa.nascimento)
			return true;

		return false;
	},

	hasInvalidSizeInput: (pessoa) => {
		if (pessoa.nome.length > 100 || typeof pessoa.nome === 'number' ||
			pessoa.apelido.length > 32 || typeof pessoa.apelido === 'number'
		)
			return true;

		return false;
	},

	hasInvalidChar: (pessoa) => {
		const stackAsString = pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack.join("") : "";
		const entryData = `${pessoa.nome}${stackAsString}`;
		const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pessoa.nascimento);

		if (/\d/.test(entryData) || !validDate) {
			return true;
		}
		return false;
	},

	hasLongStack: (pessoa) => {
		const stacks = pessoa.stack && pessoa.stack.length > 0 ? pessoa.stack : [];
		const longStrings = stacks.filter(str => str.length > 32);

		if (longStrings && longStrings.length > 0)
			return true;

		return false;
	}
};

export default validations;
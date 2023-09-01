const validations = {
	hasInvalidBody: (pessoa) => {
		const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pessoa.nascimento);
		let atributosInvalidos =
			!pessoa.nascimento ||
			pessoa.nascimento.length > 10 ||
			!validDate ||
			!pessoa.nome ||
			pessoa.nome.length > 100 ||
			!pessoa.apelido ||
			pessoa.apelido.length > 32;

		if (atributosInvalidos) return true;

		if (Array.isArray(pessoa.stack)) {
			pessoa.stack.forEach((item) => {
				if (item.length > 32 || item.length == 0) return true;
			});
		}

		return false;
	},
};

export default validations;

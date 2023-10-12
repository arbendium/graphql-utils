import { parse, specifiedRules, validate } from 'graphql';

export default function prepareGraphqlDocument({
	document,
	execute,
	schema
}) {
	const documentAst = parse(document);

	const validationErrors = validate(schema, documentAst, specifiedRules);

	if (validationErrors.length > 0) {
		throw validationErrors;
	}

	return (variables, context) => execute({
		schema,
		document: documentAst,
		variableValues: JSON.parse(JSON.stringify(variables)),
		contextValue: context
	})
		.then(result => {
			if (result.errors) {
				throw result.errors;
			}

			return result.data;
		});
}

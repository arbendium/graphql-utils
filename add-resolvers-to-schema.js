import assert from 'assert';
import {
	defaultFieldResolver,
	isScalarType,
	isObjectType,
	getNamedType,
	Kind,
	print,
	GraphQLError
} from 'graphql';

function parseLiteral(typeName, ast, variables) {
	switch (ast.kind) {
	case Kind.STRING:
	case Kind.BOOLEAN:
		return ast.value;
	case Kind.INT:
	case Kind.FLOAT:
		return parseFloat(ast.value);
	case Kind.OBJECT: {
		const value = Object.create(null);
		ast.fields.forEach(field => {
			value[field.name.value] = parseLiteral(typeName, field.value, variables);
		});

		return value;
	}
	case Kind.LIST:
		return ast.values.map(n => parseLiteral(typeName, n, variables));
	case Kind.NULL:
		return null;
	case Kind.VARIABLE:
		return variables ? variables[ast.name.value] : undefined;
	default:
		throw new TypeError(`${typeName} cannot represent value: ${print(ast)}`);
	}
}

function createValidator(validator, schema) {
	const validate = validator.compile(schema);

	return (value, ast) => {
		if (!validate(value)) {
			throw new GraphQLError('Type value validation failed', {
				extensions: {
					errors: validate.errors
				},
				nodes: ast
			});
		}

		return value;
	};
}

export default function addResolversToSchema({
	resolvers,
	schema,
	validator,
	wrapFieldResolver
}) {
	Object.values(schema.getTypeMap())
		.filter(type => !getNamedType(type).name.startsWith('__'))
		.forEach(type => {
			const typeName = type.name;

			if (isScalarType(type)) {
				if (typeName in resolvers) {
					const schema = resolvers[typeName];

					const validate = createValidator(validator, schema);

					type.description = `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
					type.serialize = validate;
					type.parseValue = validate;
					type.parseLiteral = (ast, variables) => validate(
						parseLiteral(typeName, ast, variables),
						ast
					);
				}
			} else if (isObjectType(type)) {
				const fields = type.getFields();

				if (typeName in resolvers) {
					const resolverValue = resolvers[typeName];

					for (const fieldName in resolverValue) {
						const field = fields[fieldName];

						assert(field != null, `Field ${typeName}.${fieldName} not defined in schema`);

						const fieldResolve = resolverValue[fieldName];
						if (typeof fieldResolve === 'function') {
							field.resolve = wrapFieldResolver(fieldResolve);
						} else {
							Object.assign(field, fieldResolve);
						}
					}
				}

				for (const fieldName in fields) {
					const field = fields[fieldName];

					if (field.resolve == null) {
						field.resolve = wrapFieldResolver(defaultFieldResolver);
					}
				}
			}
		});

	return schema;
}

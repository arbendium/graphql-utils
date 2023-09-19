import { visit } from 'graphql';

export default function lintGraphqlSchemaAst(schemaAst) {
	const errors = [];
	let hasMutation = false;
	let hasSubscription = false;
	const usedTypes = [];

	visit(schemaAst, {
		enter(node) {
			const fieldTypes = new Set();

			if (node.kind.endsWith('TypeDefinition')) {
				const typeName = node.name.value;
				const typeIndex = usedTypes.findIndex(({ name }) => name === typeName);

				switch (typeName) {
				case 'Query':
					if (hasMutation || hasSubscription) {
						errors.push('\'Query\' should appear before \'Mutation\' and \'Subscription\'');
					}
					break;
				case 'Mutation':
					hasMutation = true;
					if (hasSubscription) {
						errors.push('\'Mutation\' should appear before \'Subscription\'');
					}
					break;
				case 'Subscription':
					hasSubscription = true;
					break;
				default:
					if (typeIndex === -1) {
						errors.push(`Type definition for '${typeName}' should not appear before use`);
					}
				}

				const fields = [];
				visit(node, {
					NamedType(node) {
						fieldTypes.add(node.name.value);
					},
					FieldDefinition(node) {
						fields.push(node.name.value);
					}
				});

				fields.forEach((field, i) => {
					for (let j = 0; j < i; j++) {
						if (field < fields[j]) {
							errors.push(`Field definition '${typeName}.${field}' should appear before '${fields[j]}'`);
							break;
						}
					}
				});

				const additionalFieldTypes = [...fieldTypes]
					.filter(field => !usedTypes.some(({ name }) => name === field))
					.map(field => ({ name: field, found: false }));

				if (typeIndex === -1) {
					usedTypes.push({ name: typeName, found: true }, ...additionalFieldTypes);
				} else {
					for (let i = typeIndex + 1; i < usedTypes.length; i++) {
						if (usedTypes[i].found) {
							errors.push(`Type definition for '${typeName}' should appear before '${usedTypes[i].name}'`);
							break;
						}
					}
					usedTypes.splice(typeIndex, 1, { name: typeName, found: true }, ...additionalFieldTypes);
				}
			} else if (node.kind === 'DirectiveDefinition') {
				visit(node, {
					NamedType(node) {
						if (!usedTypes.some(({ name }) => name === node.name.value)) {
							usedTypes.push({ name: node.name.value, found: false });
						}
					}
				});
			}
		}
	});

	return errors;
}

import type { GraphQLSchema, execute } from 'graphql';

export default function prepareGraphqlDocument(arg: {
	document: string,
	execute: typeof execute,
	schema: GraphQLSchema
}): GraphQLSchema;

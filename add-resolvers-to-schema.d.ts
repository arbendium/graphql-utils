import type Ajv from 'ajv';
import type { GraphQLFieldResolver, GraphQLSchema } from 'graphql';

export default function addResolversToSchema(arg: {
	resolvers: {
		[typeName: string]: {
			[fieldName: string]: any
		}
	},
	schema: GraphQLSchema,
	validator: Ajv,
	wrapFieldResolver: (resolver: GraphQLFieldResolver<any, any, any, any>) => GraphQLFieldResolver<any, any, any, any>
}): GraphQLSchema;

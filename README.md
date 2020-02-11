# graphql-auth-directives

[![CircleCI](https://circleci.com/gh/grand-stack/graphql-auth-directives.svg?style=svg)](https://circleci.com/gh/grand-stack/graphql-auth-directives)

Add authentication to your GraphQL API with schema directives.

## Schema directives for authorization

- [ ] `@isAuthenticated`
- [ ] `@hasRole`
- [ ] `@hasScope`

## Quick start

```sh
npm install --save graphql-auth-directives
```

Then import the schema directives you'd like to use and attach them during your GraphQL schema construction. For example using [neo4j-graphql.js' `makeAugmentedSchema`](https://grandstack.io/docs/neo4j-graphql-js-api.html#makeaugmentedschemaoptions-graphqlschema):


```js
import { IsAuthenticatedDirective, HasRoleDirective, HasScopeDirective } from "graphql-auth-directives";

const augmentedSchema = makeAugmentedSchema({
  typeDefs,
  schemaDirectives: {
    isAuthenticated: IsAuthenticatedDirective,
    hasRole: HasRoleDirective,
    hasScope: HasScopeDirective
  }
});
```

The `@hasRole`, `@hasScope`, and `@isAuthenticated` directives will now be available for use in your GraphQL schema:

```
type Query {
    userById(userId: ID!): User @hasScope(scopes: ["User:Read"])
    itemById(itemId: ID!): Item @hasScope(scopes: ["Item:Read"])
}
```

Be sure to inject the request headers into the GraphQL resolver context. For example, with Apollo Server:

```js
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    return req;
  }
});
```

A JWT must then be included in each GraphQL request in the Authorization header. For example, with Apollo Client:

```js
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';


const httpLink = createHttpLink({
    uri: <YOUR_GRAPHQL_API_URI>
});

const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('id_token'); // here we are storing the JWT in localStorage
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    }
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
});
```

## Configure

Configuration is done via environment variables.

(optional)
If you set the `JWT_SECRET` environment variable, any token recieved will be verified against the secret that is stored here. Otherwise tokens will be simply decoded and remain unverified:

```sh
export JWT_SECRET=><YOUR_JWT_SECRET_KEY_HERE>
```

(optional)
By default `@hasRole` will validate the `roles`, `role`, `Roles`, or `Role` claim (whichever is found first). You can override this by setting `AUTH_DIRECTIVES_ROLE_KEY` environment variable. For example, if your role claim is stored in the JWT like this

```sh
"https://grandstack.io/roles": [
    "admin"
]
```

Set:

```sh
export AUTH_DIRECTIVES_ROLE_KEY=https://grandstack.io/roles
```

## Test JWTs

Scopes: user:CRUD

~~~
key: qwertyuiopasdfghjklzxcvbnm123456
~~~

~~~
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTQ5MTQ1Mjk0LCJleHAiOjE1ODA2ODEzMDcsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsIlJvbGUiOiJBRE1JTiIsIlNjb3BlIjpbIlVzZXI6UmVhZCIsIlVzZXI6Q3JlYXRlIiwiVXNlcjpVcGRhdGUiLCJVc2VyOkRlbGV0ZSJdfQ.nKADki8iKTpKqq3CVdrGAUrSzSBmFolWzYOsA_ULSdo
~~~

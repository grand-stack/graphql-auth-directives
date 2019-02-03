[![CircleCI](https://circleci.com/gh/grand-stack/graphql-auth-directives.svg?style=svg)](https://circleci.com/gh/grand-stack/graphql-auth-directives)

# graphql-auth-directives

Add authentication to your GraphQL API with schema directives.

## Schema directives for authorization

- [ ] `@isAuthenticated`
- [ ] `@hasRole`
- [ ] `@hasScope`

## Quick start

```
npm install --save graphql-auth-directives
```

Then import the schema directives you'd like to use and attach them during your GraphQL schema construction. For example using [neo4j-graphql.js' `makeAugmentedSchema`](https://grandstack.io/docs/neo4j-graphql-js-api.html#makeaugmentedschemaoptions-graphqlschema):

```
import { IsAuthenticatedDirective, HasRoleDirective } from "graphql-auth-directives";
const augmentedSchema = makeAugmentedSchema({
  typeDefs,
  schemaDirectives: {
    isAuthenticated: IsAuthenticatedDirective,
    hasRole: HasRoleDirective
  }
});
```

## Test JWTs

Scopes: user:CRUD

~~~
key: qwertyuiopasdfghjklzxcvbnm123456
~~~

~~~
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJHUkFORHN0YWNrIiwiaWF0IjoxNTQ5MTQ1Mjk0LCJleHAiOjE1ODA2ODEzMDcsImF1ZCI6ImdyYW5kc3RhY2suaW8iLCJzdWIiOiJib2JAbG9ibGF3LmNvbSIsIlJvbGUiOiJBRE1JTiIsIlNjb3BlIjpbIlVzZXI6UmVhZCIsIlVzZXI6Q3JlYXRlIiwiVXNlcjpVcGRhdGUiLCJVc2VyOkRlbGV0ZSJdfQ.nKADki8iKTpKqq3CVdrGAUrSzSBmFolWzYOsA_ULSdo
~~~
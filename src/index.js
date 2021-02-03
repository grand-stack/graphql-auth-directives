import { AuthorizationError } from "./errors";
import { IncomingMessage } from "http";
import * as jwt from "jsonwebtoken";
import { SchemaDirectiveVisitor } from "graphql-tools";
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLList,
  GraphQLString
} from "graphql";

const verifyAndDecodeToken = ({ context }) => {
  const req =
    context instanceof IncomingMessage
      ? context
      : context.req || context.request;

  if (
    !req ||
    !req.headers ||
    (!req.headers.authorization && !req.headers.Authorization) ||
    (!req && !req.cookies && !req.cookies.token)
  ) {
    throw new AuthorizationError({ message: "No authorization token." });
  }

  const token =
    req.headers.authorization || req.headers.Authorization || req.cookies.token;
  try {
    const id_token = token.replace("Bearer ", "");
    const { JWT_SECRET, JWT_NO_VERIFY } = process.env;

    if (!JWT_SECRET && JWT_NO_VERIFY) {
      return jwt.decode(id_token);
    } else {
      return jwt.verify(id_token, JWT_SECRET, {
        algorithms: ["HS256", "RS256"]
      });
    }
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AuthorizationError({
        message: "Your token is expired"
      });
    } else {
      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    }
  }
};

const useDefaultFieldResolverIfNotDefined = fieldResolver => {
  if (typeof fieldResolver === "undefined") {
    return function(result, args, context, info) {
      return result[info.fieldName];
    };
  }
  return fieldResolver;
};

export class HasScopeDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "hasScope",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
      args: {
        scopes: {
          type: new GraphQLList(GraphQLString),
          defaultValue: "none:read"
        }
      }
    });
  }

  // used for example, with Query and Mutation fields
  visitFieldDefinition(field) {
    const expectedScopes = this.args.scopes;
    const next = useDefaultFieldResolverIfNotDefined(field.resolve);

    // wrap resolver with auth check
    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });

      const scopes = process.env.AUTH_DIRECTIVES_SCOPE_KEY
        ? decoded[process.env.AUTH_DIRECTIVES_SCOPE_KEY] || []
        : decoded["permissions"] ||
          decoded["Permissions"] ||
          decoded["Scopes"] ||
          decoded["scopes"] ||
          decoded["Scope"] ||
          decoded["scope"] ||
          [];

      if (expectedScopes.some(scope => scopes.indexOf(scope) !== -1)) {
        return next(result, args, { ...context, user: decoded }, info);
      }

      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedScopes = this.args.scopes;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;
      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context });

        const scopes = process.env.AUTH_DIRECTIVES_SCOPE_KEY
          ? decoded[process.env.AUTH_DIRECTIVES_SCOPE_KEY] || []
          : decoded["permissions"] ||
            decoded["Permissions"] ||
            decoded["Scopes"] ||
            decoded["scopes"] ||
            decoded["Scope"] ||
            decoded["scope"] ||
            [];

        if (expectedScopes.some(role => scopes.indexOf(role) !== -1)) {
          return next(result, args, { ...context, user: decoded }, info);
        }
        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      };
    });
  }
}

export class HasRoleDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "hasRole",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
      args: {
        roles: {
          type: new GraphQLList(schema.getType("Role")),
          defaultValue: "reader"
        }
      }
    });
  }

  visitFieldDefinition(field) {
    const expectedRoles = this.args.roles;
    const next = useDefaultFieldResolverIfNotDefined(field.resolve);

    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });

      const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
        ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
        : decoded["Roles"] ||
          decoded["roles"] ||
          decoded["Role"] ||
          decoded["role"] ||
          [];

      if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
        return next(result, args, { ...context, user: decoded }, info);
      }

      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedRoles = this.args.roles;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;
      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context });

        const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
          ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
          : decoded["Roles"] ||
            decoded["roles"] ||
            decoded["Role"] ||
            decoded["role"] ||
            [];

        if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
          return next(result, args, { ...context, user: decoded }, info);
        }
        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      };
    });
  }
}

export class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName, schema) {
    return new GraphQLDirective({
      name: "isAuthenticated",
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT]
    });
  }

  visitObject(obj) {
    const fields = obj.getFields();

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = useDefaultFieldResolverIfNotDefined(field.resolve);

      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context }); // will throw error if not valid signed jwt
        return next(result, args, { ...context, user: decoded }, info);
      };
    });
  }

  visitFieldDefinition(field) {
    const next = useDefaultFieldResolverIfNotDefined(field.resolve);

    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });
      return next(result, args, { ...context, user: decoded }, info);
    };
  }
}

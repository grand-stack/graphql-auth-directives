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
  const req = context instanceof IncomingMessage ? context : (context.req || context.request);

  if (
    !req ||
    !req.headers ||
    (!req.headers.authorization && !req.headers.Authorization)
  ) {
    throw new AuthorizationError({ message: "No authorization token." });
  }

  const token = req.headers.authorization || req.headers.Authorization;
  try {
    const id_token = token.replace("Bearer ", "");
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error(
        "No JWT secret set. Set environment variable JWT_SECRET to decode token."
      );
    }
    const decoded = jwt.verify(id_token, JWT_SECRET, {
      algorithms: ["HS256", "RS256"]
    });

    return decoded;
  } catch (err) {
    throw new AuthorizationError({
      message: "You are not authorized for this resource"
    });
  }
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
    const next = field.resolve;

    // wrap resolver with auth check
    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });

      // FIXME: override with env var
      const scopes =
        decoded["Scopes"] ||
        decoded["scopes"] ||
        decoded["Scope"] ||
        decoded["scope"] ||
        [];

      if (expectedScopes.some(scope => scopes.indexOf(scope) !== -1)) {
        return next(result, args, context, info);
      }

      throw new AuthorizationError({
        message: "You are not authorized for this resource"
      });
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedScopes = this.args.roles;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const next = field.resolve;
      field.resolve = function(result, args, context, info) {
        const decoded = verifyAndDecodeToken({ context });

        // FIXME: override w/ env var
        const scopes =
          decoded["Scopes"] ||
          decoded["scopes"] ||
          decoded["Scope"] ||
          decoded["scope"] ||
          [];

        if (expectedScopes.some(role => scopes.indexOf(role) !== -1)) {
          return next(result, args, context, info);
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
    const next = field.resolve;

    field.resolve = function(result, args, context, info) {
      const decoded = verifyAndDecodeToken({ context });

      // FIXME: override with env var
      const roles = process.env.AUTH_DIRECTIVES_ROLE_KEY
        ? decoded[process.env.AUTH_DIRECTIVES_ROLE_KEY] || []
        : decoded["Roles"] ||
          decoded["roles"] ||
          decoded["Role"] ||
          decoded["role"] ||
          [];

      if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
        return next(result, args, context, info);
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
          return next(result, args, context, info);
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
      const next = field.resolve;

      field.resolve = function(result, args, context, info) {
        verifyAndDecodeToken({ context }); // will throw error if not valid signed jwt
        return next(result, args, context, info);
      };
    });
  }

  visitFieldDefinition(field) {
    const next = field.resolve;

    field.resolve = function(result, args, context, info) {
      verifyAndDecodeToken({ context });
      return next(result, args, context, info);
    };
  }
}

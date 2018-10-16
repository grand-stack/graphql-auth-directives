import { AuthorizationError } from "./errors";
import * as jwt from "jsonwebtoken";
import { SchemaDirectiveVisitor } from "graphql-tools";
import { DirectiveLocation, GraphQLDirective, GraphQLList } from "graphql";

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
    field.resolve = async function(result, args, context, info) {
      const expectedRoles = this.args.roles;
      if (!context || !context.headers || !context.headers.authorization) {
        throw new AuthorizationError({ message: "No authorization token." });
      }

      const token = context.headers.authorization;
      try {
        const id_token = token.replace("Bearer ", "");

        const decoded = jwt.verify(id_token, process.env.JWT_SECRET, {
          algorithms: ["RS256"]
        });
        const roles = decoded["https://grandstack.io/roles"];

        if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
          return result[fieldName];
        }

        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      } catch (err) {
        throw new AuthorizationError({
          message: "You are not authorized for this resource"
        });
      }
    };
  }

  visitObject(obj) {
    const fields = obj.getFields();
    const expectedRoles = this.args.roles;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      field.resolve = async function(result, args, context, info) {
        if (!context || !context.headers || !context.headers.authorization) {
          throw new AuthorizationError({ message: "No authorization token" });
        }

        const token = context.headers.authorization;

        try {
          const id_token = token.replace("Bearer ", "");
          const decoded = jwt.verify(id_token, process.env.JWT_SECRET, {
            algorithms: ["RS256"]
          });

          const roles = decoded["https://grandstack.io/roles"];
        
          if (expectedRoles.some(role => roles.indexOf(role) !== -1)) {
            return result[fieldName];
          }
          throw new AuthorizationError({
            message: "You are not authorized for this resource"
          });
        } catch (err) {
          throw new AuthorizationError({ message: "You are not authorized!!" });
        }
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
      field.resolve = async function(result, args, context, info) {
        if (!context || !context.headers || !context.headers.authorization) {
          throw new AuthorizationError({ message: "No authorization token." });
        }
        const token = context.headers.authorization;
        try {
          const id_token = token.replace("Bearer ", "");
      
          const decoded = jwt.verify(id_token, process.env.JWT_SECRET, {
            algorithms: ["RS256"]
          });
          return result[fieldName];
        } catch (err) {
          throw new AuthorizationError({ message: "You are not authorized." });
        }
      };
    });
  }

  visitFieldDefinition(field) {
    
    field.resolve = async function(result, args, context, info) {
      
      if (!context || !context.headers || !context.headers.authorization) {
        throw new AuthorizationError({ message: "No authorization token." });
      }
      const token = context.headers.authorization;
      try {
        const id_token = token.replace("Bearer ", "");

        const decoded = jwt.verify(id_token, process.env.JWT_SECRET, {
          algorithms: ["RS256"]
        });
        return result[field.name];
      } catch (err) {
        throw new AuthorizationError({
          message: "You are not authorized for this resource."
        });
      }
    };
  }
}
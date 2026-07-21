"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
/** Validates req[target] against a Zod schema and replaces it with the parsed (typed, coerced) value. */
function validate(schema, target = "body") {
    return (req, _res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            return next(result.error);
        }
        req[target] = result.data;
        return next();
    };
}
//# sourceMappingURL=validate.middleware.js.map
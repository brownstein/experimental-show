"use strict";
const Ajv = require("ajv")({ v5: true, allErrors: true });

// set up AJV validator helper, V3 floor schema
const _buildValidator = schema => {
    const validator = Ajv.compile(schema);
    return entity => {
        validator(entity);
        if (validator.errors) {
            return validator.errors;
        }
        else {
            return null;
        }
    };
};

const v3FloorSchema = {
    type: "object",
    properties: {
        points: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    x:  { type: "number" },
                    y:  { type: "number" },
                    id: { type: "number" }
                },
                required: [
                    "x", "y", "id"
                ]
            }
        }
    },
    required: [
        "points"
    ]
};

// build validator for V3 floor schema, checker which negates errors
const v3FloorValidator = _buildValidator(v3FloorSchema);
const isV3Floor = entity => !v3FloorValidator(entity);

/**
 * Turns JSON objects into crude JSON-schema-esque defs.
 */
function inferSchema (instance) {
  if (Array.isArray(instance)) {
    return {
      type: "array",
      items: inferSchema(instance[0]),
      length: instance.length
    };
  }
  if (instance instanceof Object) {
    const keys = Object.keys(instance);
    let identicalKeyStruct = false;
    if (keys.length >= 2) {
      const subStructA = inferSchema(instance[keys[0]]);
      const subStructB = inferSchema(instance[keys[1]]);
      if (flattenSchema(subStructA) === flattenSchema(subStructB)) {
        identicalKeyStruct = subStructA;
      }
    }
    const ret = { type: "object" };
    if (!identicalKeyStruct || (keys.length < 8)) {
      const props = ret.properties = {};
      Object.keys(instance).forEach(k => { props[k] = inferSchema(instance[k]); });
    }
    if (identicalKeyStruct) {
      ret.identicalProperties = identicalKeyStruct;
    }
    return ret;
  }
  switch (typeof instance) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "null":
      return { type: "null" };
    case "boolean":
      return { type: "boolean" };
    default:
      return { unknown: true };
  }
}

// flattening function for comparisons
function flattenSchema (def) {
  switch (def.type) {
    case "string":
      return "s";
    case "number":
      return "n";
    case "boolean":
      return "b";
    case "null":
      return "0";
    case "array":
      return "a[".concat(flattenSchema(def.items)).concat("]");
    case "object":
      if (def.identicalProperties) {
        return "o[_identical::"+flattenSchema(def.identicalProperties)+"]";
      }
      if (def.properties) {
        const props = Object.keys(def.properties);
        props.sort();
        return "o[".concat(props.map(pn =>
          pn+":"+flattenSchema(def.properties[pn])).join("|")
        ).concat("]");
      }
      return "o[]";
  }
}

module.exports = {
    inferSchema,
    isV3Floor
};

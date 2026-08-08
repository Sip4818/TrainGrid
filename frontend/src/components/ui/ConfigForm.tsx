import { Input } from "./Input";
import { Select } from "./Select";

/**
 * Minimal JSON Schema subset emitted by Pydantic's model_json_schema().
 */
export interface JsonSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: { type?: string };
  anyOf?: Array<{ type?: string }>;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface ConfigFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

/**
 * Resolve the concrete JSON Schema type for a property, following `anyOf`
 * unions (e.g. `integer | null`) down to the non-null variant.
 */
function resolveType(prop: JsonSchemaProperty): string | null {
  if (prop.type) return prop.type;
  if (Array.isArray(prop.anyOf)) {
    const nonNull = prop.anyOf.find((variant) => variant.type !== "null");
    return nonNull?.type ?? null;
  }
  return null;
}

function humanize(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Seed form-level values from a schema: optional fields get their default,
 * required fields start empty.
 */
export function seedConfigFromSchema(
  schema: JsonSchema,
): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<
    string,
    JsonSchemaProperty
  >;
  const seeded: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(properties)) {
    const type = resolveType(prop);
    if (prop.default !== undefined && prop.default !== null) {
      if (type === "boolean") {
        seeded[name] = Boolean(prop.default);
      } else if (type === "array") {
        seeded[name] = (prop.default as unknown[]).join(", ");
      } else {
        seeded[name] = String(prop.default);
      }
    } else {
      seeded[name] = type === "boolean" ? false : "";
    }
  }
  return seeded;
}

/**
 * Coerce form-level values back into a typed config dict, omitting empty
 * optional fields so the backend's Pydantic defaults apply.
 */
export function buildConfigFromSchema(
  values: Record<string, unknown>,
  schema: JsonSchema,
): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<
    string,
    JsonSchemaProperty
  >;
  const required = new Set(schema.required ?? []);
  const config: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(properties)) {
    const value = values[name];
    if (value === undefined) continue;
    const type = resolveType(prop);
    if (type === "array") {
      config[name] = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (type === "integer" || type === "number") {
      const text = String(value).trim();
      if (text === "" && !required.has(name)) continue;
      config[name] = Number(text);
    } else if (type === "boolean") {
      config[name] = Boolean(value);
    } else {
      const text = String(value).trim();
      if (text === "" && !required.has(name)) continue;
      config[name] = text;
    }
  }
  return config;
}

/**
 * Schema-driven config renderer: walks a JSON Schema's `properties` and
 * renders one input per field (text, number, comma-separated, select,
 * checkbox). Purely presentational — the parent owns the form state.
 */
export function ConfigForm({
  schema,
  values,
  onChange,
}: ConfigFormProps): React.ReactElement {
  const properties = (schema.properties ?? {}) as Record<
    string,
    JsonSchemaProperty
  >;
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return <></>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {entries.map(([name, prop]) => {
        const label = prop.title ?? humanize(name);
        const isRequired = required.has(name);
        const type = resolveType(prop);
        const value = values[name];

        if (prop.enum) {
          return (
            <Select
              key={name}
              label={label}
              required={isRequired}
              value={String(value ?? "")}
              onChange={(e) => onChange(name, e.target.value)}
              options={(prop.enum as unknown[]).map((option) => ({
                value: String(option),
                label: String(option),
              }))}
            />
          );
        }

        if (type === "boolean") {
          const checkboxId = label.toLowerCase().replace(/\s+/g, "-");
          return (
            <label
              key={name}
              htmlFor={checkboxId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(name, e.target.checked)}
              />
              {label}
            </label>
          );
        }

        if (type === "array") {
          return (
            <Input
              key={name}
              label={label}
              required={isRequired}
              placeholder="comma-separated values"
              value={String(value ?? "")}
              onChange={(e) => onChange(name, e.target.value)}
            />
          );
        }

        if (type === "integer" || type === "number") {
          return (
            <Input
              key={name}
              label={label}
              required={isRequired}
              type="number"
              step={type === "integer" ? "1" : "any"}
              value={String(value ?? "")}
              onChange={(e) => onChange(name, e.target.value)}
            />
          );
        }

        return (
          <Input
            key={name}
            label={label}
            required={isRequired}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(name, e.target.value)}
          />
        );
      })}
    </div>
  );
}

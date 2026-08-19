import { useRef } from "react";
import { Input } from "./Input";
import { Select } from "./Select";
import { Button } from "./Button";

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
  x_widget?: string;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * A dataset selectable from the create-run modal picker. Kept as a plain
 * type so the UI layer does not depend on the datasets feature module.
 */
export interface DatasetOption {
  store_key: string;
  name: string;
}

/** Sentinel select value that reveals the literal-path text input. */
const CUSTOM_PATH = "__custom__";

interface ConfigFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  datasets?: DatasetOption[];
  onUploadDataset?: (file: File) => void;
  isUploading?: boolean;
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
  datasets = [],
  onUploadDataset,
  isUploading = false,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadDataset?.(file);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {entries.map(([name, prop]) => {
        const label = prop.title ?? humanize(name);
        const isRequired = required.has(name);
        const type = resolveType(prop);
        const value = values[name];

        if (prop.x_widget === "dataset") {
          const currentValue = String(value ?? "");
          const matchesUploaded = datasets.some(
            (d) => d.store_key === currentValue,
          );
          const isCustom = !matchesUploaded;
          const selectedOption = matchesUploaded ? currentValue : CUSTOM_PATH;

          return (
            <div
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <Select
                label={label}
                required={isRequired}
                value={selectedOption}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(name, val === CUSTOM_PATH ? "" : val);
                }}
                options={[
                  ...datasets.map((d) => ({
                    value: d.store_key,
                    label: d.name,
                  })),
                  { value: CUSTOM_PATH, label: "Custom path\u2026" },
                ]}
              />
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                {isCustom && (
                  <Input
                    aria-label={`${label} custom path`}
                    type="text"
                    placeholder="e.g. backend/datasets/sample.csv"
                    value={currentValue}
                    onChange={(e) => onChange(name, e.target.value)}
                    style={{ flex: 1 }}
                  />
                )}
                {onUploadDataset && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isUploading}
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    {isUploading ? "Uploading\u2026" : "Upload dataset"}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label={`${label} file input`}
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </div>
              {datasets.length === 0 && currentValue === "" && (
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {"No datasets uploaded yet \u2014 use a custom path or upload one."}
                </span>
              )}
            </div>
          );
        }

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

import type { Component } from "vue";

export type ToolCategoryId =
  | "encoding"
  | "formatter"
  | "crypto"
  | "text"
  | "color"
  | "dev";

export type ToolId =
  | "base64"
  | "url"
  | "unicode"
  | "html-entity"
  | "json"
  | "sql"
  | "xml"
  | "md5"
  | "sha"
  | "timestamp"
  | "regex"
  | "word-count"
  | "case-convert"
  | "color"
  | "jwt-parse"
  | "qr"
  | "password"
  | "cron"
  | "json-diff";

export type ToolFieldType = "text" | "textarea" | "number" | "color";
export type ToolOptionType =
  | "select"
  | "radio"
  | "switch"
  | "checkbox-group"
  | "number";
export type ToolOptionValue = string | number | boolean | string[];
export type ToolInputValues = Record<string, string>;
export type ToolOptionValues = Record<string, ToolOptionValue>;

export interface ToolFieldDefinition {
  key: string;
  label: string;
  type: ToolFieldType;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  monospace?: boolean;
}

export interface ToolOptionChoice<
  TValue extends ToolOptionValue = ToolOptionValue,
> {
  label: string;
  value: TValue;
}

interface ToolOptionBase<
  TType extends ToolOptionType,
  TValue extends ToolOptionValue,
> {
  key: string;
  label: string;
  type: TType;
  defaultValue: TValue;
  helperText?: string;
}

export interface ToolSelectOption extends ToolOptionBase<
  "select" | "radio",
  string
> {
  options: ToolOptionChoice<string>[];
}

export interface ToolSwitchOption extends ToolOptionBase<"switch", boolean> {}

export interface ToolCheckboxGroupOption extends ToolOptionBase<
  "checkbox-group",
  string[]
> {
  options: ToolOptionChoice<string>[];
}

export interface ToolNumberOption extends ToolOptionBase<"number", number> {
  min?: number;
  max?: number;
  step?: number;
}

export type ToolOptionDefinition =
  | ToolSelectOption
  | ToolSwitchOption
  | ToolCheckboxGroupOption
  | ToolNumberOption;

export interface ToolFeatures {
  hasSwap?: boolean;
  hasCopy?: boolean;
  hasClear?: boolean;
  hasExample?: boolean;
  hasExport?: boolean;
  multiInput?: boolean;
}

export interface ToolExample {
  inputs: ToolInputValues;
  options?: Partial<ToolOptionValues>;
}

export interface ToolMeta {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategoryId;
  icon: Component;
  keywords: string[];
  inputs: ToolFieldDefinition[];
  options: ToolOptionDefinition[];
  features: ToolFeatures;
  example: ToolExample;
  outputLabel?: string;
  inputLimitBytes?: number;
  outputFileExtension?: string;
  outputMimeType?: string;
  requiresAuth?: boolean;
}

export interface ToolCategoryMeta {
  id: ToolCategoryId;
  name: string;
  description: string;
  icon: Component;
  order: number;
  tools: ToolMeta[];
}

export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
}

export interface RegexMatchItem {
  index: number;
  text: string;
  groups: string[];
}

export interface TimestampEntry {
  label: string;
  value: string;
}

export interface ColorVariant {
  label: string;
  value: string;
}

export interface CaseVariant {
  key: string;
  label: string;
  value: string;
}

export interface JwtHeader {
  alg: string;
  typ?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  sub?: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  text: string;
}

export type ToolResultDetails =
  | {
      kind: "metrics";
      title?: string;
      items: MetricItem[];
    }
  | {
      kind: "regex";
      sourceText: string;
      pattern: string;
      flags: string;
      matches: RegexMatchItem[];
    }
  | {
      kind: "timestamp";
      entries: TimestampEntry[];
    }
  | {
      kind: "color";
      swatch: string;
      variants: ColorVariant[];
    }
  | {
      kind: "case";
      selectedKey: string;
      variants: CaseVariant[];
    }
  | {
      kind: "jwt";
      header: JwtHeader;
      payload: JwtPayload;
      signatureValid: boolean;
      signatureMessage: string;
      encoded: {
        header: string;
        payload: string;
        signature: string;
      };
    }
  | {
      kind: "image";
      src: string;
      alt: string;
      width?: number;
      height?: number;
    }
  | {
      kind: "diff";
      lines: DiffLine[];
    };

export interface ToolProcessPayload {
  toolId: ToolId;
  inputs: ToolInputValues;
  options: ToolOptionValues;
}

export interface ToolProcessResult {
  output: string;
  details: ToolResultDetails | null;
}

export interface ToolState {
  input: string;
  output: string;
  extraInputs: ToolInputValues;
  options: ToolOptionValues;
  isLoading: boolean;
  error: string | null;
  details: ToolResultDetails | null;
}

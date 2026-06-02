export type DefaultMessages = Record<"appName" | "version" | "status" | "statusText" | "description", string | boolean | number>;
export declare const template: (messages: Partial<DefaultMessages>) => string;

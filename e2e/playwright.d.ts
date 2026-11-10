declare module '@playwright/test' {
  export interface Locator {
    click: (options?: { force?: boolean; timeout?: number }) => Promise<void>;
    fill: (value: string, options?: { force?: boolean; timeout?: number }) => Promise<void>;
    first: () => Locator;
    last: () => Locator;
    locator: (selector: string) => Locator;
    getByRole: (role: string, options?: { name?: string | RegExp }) => Locator;
    getByPlaceholder: (text: string | RegExp) => Locator;
    getByText: (text: string | RegExp) => Locator;
    count: () => Promise<number>;
    isVisible: () => Promise<boolean>;
    getAttribute: (name: string) => Promise<string | null>;
  }

  export interface RouteFulfillResponse {
    status?: number;
    contentType?: string;
    body?: string;
    headers?: Record<string, string>;
  }

  export interface Route {
    fulfill: (response: RouteFulfillResponse) => Promise<void>;
    continue: () => Promise<void>;
    abort: (errorCode?: string) => Promise<void>;
  }

  export interface Page {
    goto: (url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }) => Promise<any>;
    getByRole: (role: string, options?: { name?: string | RegExp }) => Locator;
    getByPlaceholder: (text: string | RegExp) => Locator;
    getByText: (text: string | RegExp) => Locator;
    locator: (selector: string) => Locator;
    route: (url: string | RegExp, handler: (route: Route) => Promise<void> | void) => Promise<void>;
    addInitScript: <T = any>(script: (arg: T) => void, arg?: T) => Promise<void>;
    waitForURL: (url: string | RegExp) => Promise<void>;
    url: () => string;
  }

  export interface TestArgs {
    page: Page;
  }

  export interface TestFunction {
    (name: string, fn: (args: TestArgs) => Promise<void> | void): void;
    describe: (name: string, fn: () => void) => void;
    beforeEach: (fn: (args: TestArgs) => Promise<void> | void) => void;
    afterEach: (fn: (args: TestArgs) => Promise<void> | void) => void;
    skip: (name: string, fn?: (args: TestArgs) => Promise<void> | void) => void;
    only: (name: string, fn: (args: TestArgs) => Promise<void> | void) => void;
  }

  export interface ExpectMatcher {
    toBeVisible: () => Promise<void>;
    toBeHidden: () => Promise<void>;
    toHaveURL: (url: string | RegExp) => Promise<void>;
    toHaveAttribute: (name: string, value: string | RegExp) => Promise<void>;
    toHaveText: (text: string | RegExp) => Promise<void>;
    toContainText: (text: string | RegExp) => Promise<void>;
    toBeDisabled: () => Promise<void>;
    toBeEnabled: () => Promise<void>;
    toBeChecked: () => Promise<void>;
  }

  export const test: TestFunction;
  export const expect: (actual: any) => ExpectMatcher;
  export function defineConfig(config: any): any;
  export const devices: Record<string, any>;
}


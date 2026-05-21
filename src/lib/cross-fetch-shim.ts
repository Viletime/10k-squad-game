// A dummy fetch to satisfy cross-fetch imports without modifying global fetch
export const fetch = typeof window !== 'undefined' ? window.fetch : globalThis.fetch;
export const Headers = typeof window !== 'undefined' ? window.Headers : globalThis.Headers;
export const Request = typeof window !== 'undefined' ? window.Request : globalThis.Request;
export const Response = typeof window !== 'undefined' ? window.Response : globalThis.Response;
export default fetch;

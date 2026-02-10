import { request as pwRequest, APIRequestContext } from "playwright";

export type HttpOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
};

export class HttpClient {
  private ctx!: APIRequestContext;

  async init(opts?: HttpOptions) {
    this.ctx = await pwRequest.newContext({
      baseURL: opts?.baseUrl,
      extraHTTPHeaders: opts?.headers
    });
  }

  async dispose() {
    await this.ctx?.dispose();
  }

  get context() {
    return this.ctx;
  }

  async get(url: string, headers?: Record<string, string>) {
    const res = await this.ctx.get(url, { headers });
    return res;
  }

  async post(url: string, data?: any, headers?: Record<string, string>) {
    const res = await this.ctx.post(url, { data, headers });
    return res;
  }

  async put(url: string, data?: any, headers?: Record<string, string>) {
    const res = await this.ctx.put(url, { data, headers });
    return res;
  }

  async patch(url: string, data?: any, headers?: Record<string, string>) {
    const res = await this.ctx.patch(url, { data, headers });
    return res;
  }

  async del(url: string, headers?: Record<string, string>) {
    const res = await this.ctx.delete(url, { headers });
    return res;
  }
}

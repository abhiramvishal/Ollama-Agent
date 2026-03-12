import * as http from 'http';
import * as vscode from 'vscode';
import type { LLMProvider, ChatMessage } from '../providers/llmProvider';

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClawProxyOptions {
  port?: number;
}

export class ClawProxy {
  private server: http.Server | null = null;
  private currentPort: number | null = null;

  constructor(private readonly client: LLMProvider) {}

  async start(): Promise<number> {
    if (this.server) {
      return this.currentPort ?? 0;
    }

    const config = vscode.workspace.getConfiguration('clawpilot');
    const port = config.get<number>('proxyPort', 11435);

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(err => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify({ error: { message: err instanceof Error ? err.message : String(err) } }));
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(port, () => {
        this.server!.off('error', reject);
        resolve();
      });
    });

    this.currentPort = port;
    vscode.window.setStatusBarMessage(`ClawPilot Proxy: listening on :${port}`, 5000);
    return port;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.currentPort = null;
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '';
    const method = req.method || 'GET';

    if (method === 'POST' && url === '/v1/chat/completions') {
      await this.handleChatCompletions(req, res);
      return;
    }
    if (method === 'POST' && url === '/v1/completions') {
      await this.handleCompletions(req, res);
      return;
    }
    if (method === 'GET' && url === '/v1/models') {
      await this.handleModels(req, res);
      return;
    }
    if (method === 'POST' && url === '/v1/models') {
      await this.handleModels(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  }

  private async readJsonBody<T = any>(req: http.IncomingMessage): Promise<T> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw) as T;
  }

  private toOllamaMessagesFromChat(body: any): ChatMessage[] {
    const msgs = Array.isArray(body.messages) ? body.messages as OpenAIChatMessage[] : [];
    return msgs.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  private toOllamaMessagesFromCompletion(body: any): ChatMessage[] {
    const prompt: string = typeof body.prompt === 'string' ? body.prompt : Array.isArray(body.prompt) ? body.prompt.join('\n') : '';
    return [{ role: 'user', content: prompt }];
  }

  private getModelFromBody(body: any): string {
    const cfg = vscode.workspace.getConfiguration('clawpilot');
    const fallback = cfg.get<string>('model', 'llama3');
    return typeof body.model === 'string' && body.model.trim() ? body.model.trim() : fallback;
  }

  private async handleChatCompletions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req);
    const model = this.getModelFromBody(body);
    const messages = this.toOllamaMessagesFromChat(body);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.client.streamChat(messages, model)) {
        const payload = {
          choices: [
            {
              delta: { content: chunk },
            },
          ],
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const payload = {
        error: { message },
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  private async handleCompletions(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req);
    const model = this.getModelFromBody(body);
    const messages = this.toOllamaMessagesFromCompletion(body);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.client.streamChat(messages, model)) {
        const payload = {
          choices: [
            {
              delta: { content: chunk },
            },
          ],
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const payload = {
        error: { message },
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  private async handleModels(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const models = await this.client.listModels();
      const data = models.map(m => ({
        id: m.name,
        object: 'model',
        created: m.modified_at ? Math.floor(new Date(m.modified_at).getTime() / 1000) : 0,
        owned_by: this.client.providerType,
      }));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ object: 'list', data }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: { message: err instanceof Error ? err.message : String(err) },
      }));
    }
  }
}


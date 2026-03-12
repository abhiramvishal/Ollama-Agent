# Ollama Copilot

**Ollama Copilot** is a free, fully local AI coding assistant for VS Code powered by [Ollama](https://ollama.com). It works like an open-source alternative to GitHub Copilot and Cursor — no API keys, no cloud, no cost. Everything runs on your machine.

## Quick start

1. **Install Ollama**  
   Download and install from [ollama.com](https://ollama.com), then start the Ollama app (it runs a local server).

2. **Pull a model**  
   In a terminal:
   ```bash
   ollama pull llama3
   ```
   Or use **Ollama: Pull Model** from the Command Palette and pick a model.

3. **Run the extension**  
   Open this folder in VS Code, press **F5** to launch the Extension Development Host.  
   You’ll see the **Ollama Copilot** icon in the activity bar. Click it to open the chat panel.

4. **Use it**  
   - Chat in the sidebar.  
   - Select code and use **Ollama: Explain / Refactor / Fix / Generate Docs** from the right-click menu.  
   - Inline completions appear as you type (if enabled in settings).

## Supported models

Use `ollama pull <name>` to install. Suggested models for code:

| Category   | Model name           | Pull command              | Notes          |
|-----------|----------------------|---------------------------|----------------|
| **Code**   | DeepSeek Coder 6.7B  | `ollama pull deepseek-coder:6.7b`  | Good balance   |
| **Code**   | DeepSeek Coder 33B   | `ollama pull deepseek-coder:33b`  | Higher quality |
| **Code**   | Qwen2.5 Coder 7B     | `ollama pull qwen2.5-coder:7b`    | Fast, capable  |
| **Code**   | Code Llama 7B        | `ollama pull codellama:7b`        | General code   |
| **Code**   | StarCoder2 7B        | `ollama pull starcoder2:7b`       | Code-focused   |
| **General**| Llama 3.2 3B         | `ollama pull llama3.2:3b`         | Small, fast    |
| **General**| Llama 3.1 8B         | `ollama pull llama3.1:8b`         | Strong general |
| **General**| Mistral 7B           | `ollama pull mistral:7b`          | Good all-round |
| **Small**  | TinyLlama            | `ollama pull tinyllama`           | Very fast      |
| **Small**  | Phi 3.5              | `ollama pull phi3.5`              | Fast, small    |

The extension’s model selector and **Ollama: Pull Model** list all supported models by category.

## Settings

| Setting | Default | Description |
|--------|--------|-------------|
| `ollamaCopilot.endpoint` | `http://localhost:11434` | Ollama API base URL |
| `ollamaCopilot.model` | `llama3` | Default model for chat and completions |
| `ollamaCopilot.enableInlineCompletion` | `true` | Enable Copilot-style inline completions |
| `ollamaCopilot.completionDebounceMs` | `600` | Debounce (ms) before requesting a completion |
| `ollamaCopilot.maxTokens` | `512` | Max tokens per completion/response |
| `ollamaCopilot.systemPrompt` | *(expert coding assistant)* | System prompt for the chat |

## Keyboard shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+O` (Windows/Linux) / `Cmd+Shift+O` (macOS) | Ollama: Open Chat |
| `Ctrl+Shift+E` / `Cmd+Shift+E` (with selection) | Ollama: Explain Code |

## Packaging as .vsix

```bash
npm install
npm run compile
npx vsce package
```

The `.vsix` file is created in the project root. Install it via **Extensions** → **...** → **Install from VSIX**.

## Privacy

- **100% local.** All requests go to your local Ollama server. No code or data is sent to the cloud.
- **No telemetry.** The extension does not collect or report any usage data.

## License

MIT

# Publishing ClawPilot to the VS Code Marketplace

## One-time setup

### 1. Create a publisher (if needed)

- Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/) and sign in with your Microsoft account.
- Click your profile → **Publish extension** (or go to the [Publisher Management](https://marketplace.visualstudio.com/manage) page).
- Create a **publisher** (e.g. `clawpilot`). The `publisher` in `package.json` must match this.

### 2. Create a Personal Access Token (PAT)

- Open [Azure DevOps Personal Access Tokens](https://dev.azure.com/_usersSettings/tokens).
- Sign in with the **same Microsoft account** you use for the marketplace.
- **New Token**:
  - Name: e.g. `VS Code Marketplace`
  - Organization: leave as is (or create one if required)
  - Expiration: as you prefer (e.g. 1 year)
  - Scopes: **Custom defined** → enable **Marketplace (Publish)**.
- Create and **copy the token** (it is shown only once).

### 3. Add the token as a GitHub secret

- In your GitHub repo: **Settings** → **Secrets and variables** → **Actions**.
- **New repository secret**:
  - Name: `VSCE_PAT`
  - Value: paste the Azure DevOps PAT.

## Releasing a new version

1. **Bump the version** in `package.json` (e.g. `1.0.0` → `1.0.1`).
2. **Commit and push** to your default branch.
3. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. The **Publish Extension** workflow runs on tag push: it builds, packages, and publishes to the marketplace using `VSCE_PAT`.

Alternatively, create a **GitHub Release** (tag + release notes). The workflow also runs on **Release published**.

## Workflows

| Workflow        | Trigger              | What it does                          |
|----------------|----------------------|----------------------------------------|
| **CI**         | Push/PR to main      | Build and package (no publish)         |
| **Publish**    | Tag `v*` or Release  | Build, package, publish to Marketplace |

To test the build without publishing, run the **CI** workflow (push to main) or run **Publish** via **Actions** → **Run workflow** (this only produces a `.vsix` artifact; the publish step runs only for tags/releases).

## Manual publish (local)

```bash
npm ci
npm run bundle:prod
npx @vscode/vsce publish -p YOUR_PAT
```

## Extension in a subfolder

If your repo root is **not** the extension (e.g. repo `Ollama-Agent` with extension in `ollama-copilot/`):

1. Move the `.github` folder to the **repo root**.
2. In both workflow files, add `defaults.run.working-directory: ollama-copilot` under the `build` job (and use the same for `publish` if it runs any commands in that folder). Or run every step as `cd ollama-copilot && <command>`.

GitHub only runs workflows from `.github` at the repository root.

## Links

- [VS Code: Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Azure DevOps PATs](https://dev.azure.com/_usersSettings/tokens)

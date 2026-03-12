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

| Workflow        | Trigger                    | What it does                          |
|----------------|----------------------------|----------------------------------------|
| **CI**         | Push/PR to main or master  | Build and package (no publish)         |
| **CI**         | Manual: Actions → CI → Run workflow | Same (run anytime)            |
| **Publish**    | Tag `v*` or Release        | Build, package, publish to Marketplace |
| **Publish**    | Manual: Actions → Run workflow | Build + package only (no publish)  |

To test the build without publishing, push to **main** or **master**, or go to **Actions** → **CI** (or **Build and Publish Extension**) → **Run workflow**.

## Builds not running?

This repo has the extension in **ollama-copilot/** with the repo root one level up. Workflows live in **.github/** at the repo root (the parent of `ollama-copilot`) and use `working-directory: ollama-copilot`. Do not add a `.github` inside `ollama-copilot`—GitHub only runs workflows from the root.

CI triggers on **main** and **master**. If your default branch is different, push to main/master or run **Actions → CI → Run workflow** manually.

## Manual publish (local)

```bash
npm ci
npm run bundle:prod
npx @vscode/vsce publish -p YOUR_PAT
```

## Repo structure

The repo root is the **parent** of `ollama-copilot` (e.g. `Ollama-Agent`). The root contains `.github/workflows/` and the `ollama-copilot/` folder. The workflows are already set up with `working-directory: ollama-copilot`.

## Links

- [VS Code: Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Azure DevOps PATs](https://dev.azure.com/_usersSettings/tokens)

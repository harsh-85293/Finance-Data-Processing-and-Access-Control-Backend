# Next Steps & Usage

## Local setup

1. Create a Codespace or use local machine.
2. Install dependencies for your chosen language (Python/Node/.NET).

## Codespaces

- Open the repository on GitHub and click **Code → Codespaces → Create codespace**.
- The included `.devcontainer/devcontainer.json` provides a baseline image and helpful extensions.

## Environment & Secrets

- Store secrets in GitHub repository Secrets for Codespaces or Actions.
- Locally, place environment variables in a `.env` (ignored by `.gitignore`).

## Running (example - Python)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m your_service
```

## Tests

- Add unit tests (e.g., `pytest` for Python) and run with `pytest`.

## CI/CD

- Add GitHub Actions workflows in `.github/workflows/` to run tests and lint on PRs.

## Add collaborators

- Via GitHub UI: Settings → Manage access → Invite collaborator.
- Via `gh` CLI:

```bash
gh repo add-collaborator harsh-85293/Finance-Data-Processing-and-Access-Control-Backend --user USERNAME --permission write
```

Please provide the GitHub usernames or email addresses of collaborators to invite, and their desired permission (`read`, `triage`, `write`, `maintain`, or `admin`).

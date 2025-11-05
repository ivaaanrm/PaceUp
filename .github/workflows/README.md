# GitHub Actions Workflows

## Deployment Workflow

The `deploy.yml` workflow automatically deploys the application to production when changes are merged to the `main` branch.

### Setup Instructions

To enable automatic deployment, you need to configure the following GitHub Secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

#### Required Secrets

- **`DEPLOY_HOST`**: Your server's IP address or hostname (e.g., `api.paceup.site` or `123.456.789.0`)
- **`DEPLOY_USER`**: SSH username (e.g., `deploy`)
- **`DEPLOY_SSH_KEY`**: Private SSH key for authentication

#### Generating SSH Key for GitHub Actions

Follow these steps to generate and configure the SSH key:

**Step 1: Generate SSH key pair (on your LOCAL machine)**

Run this command on your local computer:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

When prompted:
- Press Enter to accept the default location (or specify a different path)
- Optionally set a passphrase (recommended for security) or press Enter for no passphrase

This creates two files:
- `~/.ssh/github_actions_deploy` (private key - keep this secret!)
- `~/.ssh/github_actions_deploy.pub` (public key - safe to share)

**Step 2: Add public key to your server (from your LOCAL machine)**

Run this command on your local computer to copy the public key to your server:

```bash
cat ~/.ssh/github_actions_deploy.pub | ssh deploy@your-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Replace `your-server` with your actual server hostname or IP address (e.g., `api.paceup.site` or `123.456.789.0`).

This will:
- Connect to your server via SSH
- Create the `~/.ssh` directory if it doesn't exist
- Append the public key to the `authorized_keys` file

**Step 3: Copy private key to GitHub Secrets (on your LOCAL machine)**

Display the private key content on your local computer:

```bash
cat ~/.ssh/github_actions_deploy
```

Copy the ENTIRE output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`), then:
1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DEPLOY_SSH_KEY`
5. Value: Paste the entire private key content
6. Click **Add secret**

**Step 4: Test SSH connection (optional, from your LOCAL machine)**

Test that the key works before adding it to GitHub:

```bash
ssh -i ~/.ssh/github_actions_deploy deploy@your-server
```

If this connects successfully, the key is configured correctly.

#### Optional Secrets

- **`DEPLOY_PORT`**: SSH port (defaults to 22 if not set)

### How It Works

1. When code is pushed to or merged into the `main` branch, the workflow triggers
2. The workflow connects to your deployment server via SSH
3. It navigates to `/home/deploy/PaceUp`
4. Pulls the latest changes from the repository
5. Builds Docker images with `docker-compose build`
6. Restarts services with `docker-compose up -d`
7. Shows service status and recent logs

### Manual Trigger

You can also manually trigger the deployment from the GitHub Actions tab:
1. Go to **Actions** in your repository
2. Select the **Deploy to Production** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

### Troubleshooting

If deployment fails:

1. Check the workflow logs in the **Actions** tab
2. Verify all secrets are correctly configured
3. Ensure SSH access works from your local machine:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy deploy@your-server
   ```
4. Verify the deployment path exists on the server:
   ```bash
   ssh deploy@your-server "ls -la /home/deploy/PaceUp"
   ```
5. Check Docker and docker-compose are installed on the server:
   ```bash
   ssh deploy@your-server "docker --version && docker-compose --version"
   ```

### Security Notes

- The SSH private key should be kept secure and never committed to the repository
- Use a dedicated SSH key for GitHub Actions (not your personal key)
- Consider using SSH key passphrases for additional security
- Regularly rotate SSH keys


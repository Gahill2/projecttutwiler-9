# Installation & Startup Wizard Guide

## Overview

Guard includes a professional GUI installation and startup wizard that works like typical Windows software installers!

## Windows Startup Wizard - Single Entry Point for Everything!

The main entry point is `start.bat`, which launches `startup-wizard.ps1`. **This is the ONLY script you need to run!**

### Features - Everything in One Place

- **Automatic Docker startup** - Starts Docker Desktop automatically if it's closed
- **Step-by-step wizard interface** - Professional installer look and feel
- **Terms & Conditions** - User acceptance step
- **Prerequisites checking** - Automatically verifies Docker installation and status
- **Configuration** - Always creates/updates `.env` file from `env.template` template
- **Service status** - Checks if all services are running
- **Service startup** - Builds and starts all Docker services (including Ollama)
- **Ollama model pulling** - Automatically pulls required models
- **Completion** - Provides links to open Frontend and Admin pages

**No separate setup, configuration, or startup steps needed - the wizard handles it all!**

### Usage

**Windows:**
```bash
# Double-click or run:
start.bat
```

This launches the GUI wizard which handles:
- ✅ Automatic Docker Desktop startup (if closed)
- ✅ Always creates/updates `.env` from `env.template` (fresh config every time)
- ✅ Prerequisite verification (Docker, Docker Compose)
- ✅ Service startup and monitoring (all 8 services including Ollama)
- ✅ Automatic Ollama model pulling
- ✅ Real-time status updates

### Wizard Steps

1. **Welcome** - Introduction to Guard
2. **Terms & Conditions** - User must accept terms and grant system access
3. **Prerequisites** - Checks for:
   - Docker Desktop installation
   - Docker service status
   - Docker Compose availability
   - `.env` configuration file
4. **Configuration** - Always creates/updates `.env` file from `env.template` template (ensures fresh configuration every time)
5. **Check Services** - Verifies all 8 services are running
6. **Start Services** - Builds and starts all Docker services (if needed)
7. **Complete** - Shows completion message with links to open pages

### Mac/Linux

For Mac/Linux, use the command-line scripts:

```bash
# Make scripts executable (first time only)
chmod +x *.sh

# Run setup
./setup.sh

# Start services
./start.sh

# Check status
./check-status.sh
```

## Environment File Template

The wizard uses `env.template` as a template to create `.env` files for developers. This file is tracked in git (no leading dot, so it's not ignored) so all team members get the same configuration structure.

**Important:** 
- `env.template` is a template with placeholder values (committed to git)
- `.env` (created by wizard) is gitignored and contains actual secrets
- Each developer gets their own `.env` file during setup

## Troubleshooting

### Wizard doesn't start
- Ensure PowerShell execution policy allows scripts: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Services fail to start
- Check Docker Desktop is running
- Verify `.env` file exists and has valid values
- Check Docker logs: `docker compose logs`

### Prerequisites check fails
- Install Docker Desktop from https://www.docker.com/products/docker-desktop
- Ensure Docker Desktop is running before starting wizard

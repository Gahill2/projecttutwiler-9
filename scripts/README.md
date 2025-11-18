# Scripts Directory

This directory contains all utility and helper scripts organized by platform.

## Directory Structure

```
scripts/
├── windows/          # Windows-specific scripts (.bat)
│   ├── check-prerequisites.bat
│   └── check-status.bat
├── unix/             # Unix/Mac/Linux scripts (.sh)
│   ├── check-prerequisites.sh
│   └── check-status.sh
├── pull-ollama-models.bat    # Cross-platform Ollama model puller (Windows)
├── pull-ollama-models.sh     # Cross-platform Ollama model puller (Unix)
├── curl-tests.sh             # API testing scripts
└── setup_nv_v_databases.py   # Database setup script
```

## Usage

### Windows
- Main scripts in root: `install.bat`, `start.bat`, `setup.bat`
- Utility scripts: `scripts\windows\check-prerequisites.bat`, `scripts\windows\check-status.bat`
- Convenience shortcuts in root: `check-prerequisites.bat`, `check-status.bat` (call the organized versions)

### Mac/Linux
- Main scripts in root: `install.sh`, `start.sh`, `setup.sh`
- Utility scripts: `scripts/unix/check-prerequisites.sh`, `scripts/unix/check-status.sh`
- Convenience shortcuts in root: `check-prerequisites.sh`, `check-status.sh` (call the organized versions)

## Script Descriptions

### Prerequisites Checker
- **Windows**: `scripts\windows\check-prerequisites.bat`
- **Unix**: `scripts/unix/check-prerequisites.sh`
- Checks for required software (Docker Desktop)
- Shows popup dialogs (Windows) or prompts (Unix)
- Attempts to start Docker if not running

### Status Checker
- **Windows**: `scripts\windows\check-status.bat`
- **Unix**: `scripts/unix/check-status.sh`
- Shows status of all Docker services
- Displays popup (Windows) or console output (Unix) with service status

### Ollama Model Puller
- **Windows**: `scripts\pull-ollama-models.bat`
- **Unix**: `scripts/pull-ollama-models.sh`
- Automatically pulls required Ollama models
- Called automatically by `start.bat` / `start.sh`

## Adding New Scripts

- **Windows scripts**: Add to `scripts/windows/`
- **Unix scripts**: Add to `scripts/unix/`
- **Cross-platform scripts**: Add to `scripts/` root
- **Convenience shortcuts**: Add to project root if needed for easy access


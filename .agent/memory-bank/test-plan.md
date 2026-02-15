# Test Plan - Machu Clone

## Acceptance Criteria

### 1. Repository Existence
- **Goal**: Ensure the repository is correctly cloned to the target folder.
- **Verification**: Run `ls -la /Users/armandli/.gemini/File/Machu` and check for the presence of `.git` directory and project files (App.tsx, etc.).

### 2. Git Connection
- **Goal**: Confirm the local repository is linked to the correct remote.
- **Verification**: Run `git remote -v` and expect `https://github.com/armand7951/machu`.

### 3. File Integrity
- **Goal**: Ensure files were not corrupted during transfer.
- **Verification**: Run `git status` to confirm no local changes are present immediately after clone.

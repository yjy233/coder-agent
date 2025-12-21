/**
 * File Tools for AI Agent
 * Provides file system operations as tools for the AI agent
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

class FileTools {
  constructor(agent) {
    this.agent = agent;
    this.workingDir = agent.config.workingDir;
  }

  /**
   * Read file
   */
  async readFile(params) {
    const { path: filePath } = params;
    const fullPath = path.resolve(this.workingDir, filePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      return {
        success: true,
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write file
   */
  async writeFile(params) {
    const { path: filePath, content } = params;
    const fullPath = path.resolve(this.workingDir, filePath);

    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      return {
        success: true,
        path: filePath,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files
   */
  async listFiles(params) {
    const { path: dirPath = '.', pattern = '**/*' } = params;
    const fullPath = path.resolve(this.workingDir, dirPath);

    try {
      const files = await glob(pattern, {
        cwd: fullPath,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        nodir: false
      });

      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file);
          try {
            const stats = await fs.stat(filePath);
            return {
              path: file,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime
            };
          } catch {
            return null;
          }
        })
      );

      return {
        success: true,
        path: dirPath,
        files: fileList.filter(f => f !== null)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search files for pattern
   */
  async searchFiles(params) {
    const { pattern, path: searchPath = '.' } = params;
    const fullPath = path.resolve(this.workingDir, searchPath);

    try {
      const files = await glob('**/*.{js,ts,jsx,tsx,json,md}', {
        cwd: fullPath,
        ignore: ['**/node_modules/**', '**/.git/**']
      });

      const results = [];
      const regex = new RegExp(pattern, 'gi');

      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            results.push({
              file,
              line: index + 1,
              content: line.trim(),
              match: line.match(regex)?.[0]
            });
          }
        });
      }

      return {
        success: true,
        pattern,
        matches: results.length,
        results: results.slice(0, 100) // Limit to 100 results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create directory
   */
  async createDirectory(params) {
    const { path: dirPath } = params;
    const fullPath = path.resolve(this.workingDir, dirPath);

    try {
      await fs.mkdir(fullPath, { recursive: true });

      return {
        success: true,
        path: dirPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file
   */
  async deleteFile(params) {
    const { path: filePath } = params;
    const fullPath = path.resolve(this.workingDir, filePath);

    try {
      await fs.unlink(fullPath);

      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Copy file
   */
  async copyFile(params) {
    const { source, destination } = params;
    const sourcePath = path.resolve(this.workingDir, source);
    const destPath = path.resolve(this.workingDir, destination);

    try {
      const dir = path.dirname(destPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);

      return {
        success: true,
        source,
        destination
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Move/rename file
   */
  async moveFile(params) {
    const { source, destination } = params;
    const sourcePath = path.resolve(this.workingDir, source);
    const destPath = path.resolve(this.workingDir, destination);

    try {
      const dir = path.dirname(destPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.rename(sourcePath, destPath);

      return {
        success: true,
        source,
        destination
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(params) {
    const { path: filePath } = params;
    const fullPath = path.resolve(this.workingDir, filePath);

    try {
      const stats = await fs.stat(fullPath);

      return {
        success: true,
        path: filePath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FileTools;

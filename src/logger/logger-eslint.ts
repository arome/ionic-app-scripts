import { ESLint, Linter } from 'eslint';
const fs = require('fs');
import path from 'path';
import { IRuleFailurePositionJson } from 'tslint';
import { promisify } from 'util';
import { Diagnostic, splitLineBreaks } from '..';
import { BuildContext, PrintLine } from '../util/interfaces';
import { Logger } from './logger';
import { STOP_CHARS } from './logger-tslint';

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

/**
 * Check if a given file path is a directory or not.
 * @param {string} filePath The path to a file to check.
 * @returns {Promise<boolean>} `true` if the given path is a directory.
 */
async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

/**
 * Outputs the results of the linting.
 * @param {ESLint} engine The ESLint instance to use.
 * @param {LintResult[]} results The results to print.
 * @param {string} format The name of the formatter to use or the path to the formatter.
 * @param {string} outputFile The path for the output file.
 * @returns {Promise<boolean>} True if the printing succeeds, false if not.
 * @private
 */
export async function printResults(
  engine: ESLint,
  results: ESLint.LintResult[],
  format = '',
  outputFile = ''
): Promise<boolean> {
  let formatter;

  try {
    formatter = await engine.loadFormatter(format);
  } catch (e) {
    Logger.error(e.message);
    return false;
  }

  const output = formatter.format(results);

  if (output) {
    if (outputFile) {
      const filePath = path.resolve(process.cwd(), outputFile);

      if (await isDirectory(filePath)) {
        Logger.error('Cannot write to output file path, it is a directory: %s', outputFile);
        return false;
      }

      try {
        await mkdir(path.dirname(filePath));
        await writeFile(filePath, output);
      } catch (ex) {
        Logger.error('There was a problem writing the output file:\n%s', ex);
        return false;
      }
    } else {
      Logger.info(output);
    }
  }

  return true;
}

export function runEsLintDiagnostics(context: BuildContext, result: ESLint.LintResult) {
  return result.messages.map((message) => loadDiagnostic(context, message, result));
}

export function loadDiagnostic(context: BuildContext, message: Linter.LintMessage, result: ESLint.LintResult) {
  const start: IRuleFailurePositionJson = {
    character: 0,
    line: message.line,
    position: message.column
  };
  const end: IRuleFailurePositionJson = {
    character: 0,
    line: message.endLine,
    position: message.endColumn
  };
  const fileName = result.filePath;
  const sourceFile = result.source;

  const d: Diagnostic = {
    level: message.severity === 0 ? 'off' : message.severity === 1 ? 'warn' : 'error',
    type: 'eslint',
    language: 'typescript',
    absFileName: fileName,
    relFileName: fileName,
    header: Logger.formatHeader('eslint', fileName, context.rootDir, start.line + 1, end.line + 1),
    code: message.ruleId,
    messageText: message.message,
    lines: []
  };

  if (sourceFile) {
    const srcLines = splitLineBreaks(sourceFile);

    for (let i = start.line; i <= end.line; i++) {
      if (srcLines[i].trim().length) {
        const errorLine: PrintLine = {
          lineIndex: i,
          lineNumber: i + 1,
          text: srcLines[i],
          html: srcLines[i],
          errorCharStart: i === start.line ? start.character : i === end.line ? end.character : -1,
          errorLength: 0
        };
        for (let j = errorLine.errorCharStart; j < errorLine.text.length; j++) {
          if (STOP_CHARS.indexOf(errorLine.text.charAt(j)) > -1) {
            break;
          }
          errorLine.errorLength++;
        }

        if (errorLine.errorLength === 0 && errorLine.errorCharStart > 0) {
          errorLine.errorLength = 1;
          errorLine.errorCharStart--;
        }

        d.lines.push(errorLine);
      }
    }

    if (start.line > 0) {
      const beforeLine: PrintLine = {
        lineIndex: start.line - 1,
        lineNumber: start.line,
        text: srcLines[start.line - 1],
        html: srcLines[start.line - 1],
        errorCharStart: -1,
        errorLength: -1
      };
      d.lines.unshift(beforeLine);
    }

    if (end.line < srcLines.length) {
      const afterLine: PrintLine = {
        lineIndex: end.line + 1,
        lineNumber: end.line + 2,
        text: srcLines[end.line + 1],
        html: srcLines[end.line + 1],
        errorCharStart: -1,
        errorLength: -1
      };
      d.lines.push(afterLine);
    }
  }

  return d;
}

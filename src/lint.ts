import { lintFiles } from './lint/lint-utils';
import { Logger } from './logger/logger';
import { getUserConfigFile } from './util/config';
import { ENV_BAIL_ON_LINT_ERROR, ENV_TYPE_CHECK_ON_LINT } from './util/constants';
import { getBooleanPropertyValue } from './util/helpers';
import { getTsConfigPath } from './transpile';
import { BuildContext, ChangedFile, TaskInfo } from './util/interfaces';
import { runWorker } from './worker-client';
import { createTsProgram } from './lint/lint-factory';

export interface LintWorkerConfig {
  tsConfig: string;
  esLintConfig: string | null;
  filePaths?: string[];
  typeCheck?: boolean;
}

const taskInfo: TaskInfo = {
  fullArg: '--tslint',
  shortArg: '-i',
  envVar: 'ionic_tslint',
  packageConfig: 'IONIC_TSLINT',
  defaultConfigFile: '../tslint'
};

export async function lint(context: BuildContext, esLintConfig?: string | null, typeCheck?: boolean) {
  const logger = new Logger('lint');
  try {
    await runWorker('lint', 'lintWorker', context, {
      esLintConfig,
      tsConfig: getTsConfigPath(context),
      typeCheck: typeCheck || getBooleanPropertyValue(ENV_TYPE_CHECK_ON_LINT)
    });
    logger.finish();
  } catch (err) {
    if (getBooleanPropertyValue(ENV_BAIL_ON_LINT_ERROR)) {
      throw logger.fail(err);
    }
    logger.finish();
  }
}

export function lintWorker(context: BuildContext) {
  return lintApp(context);
}

export function lintUpdate(changedFiles: ChangedFile[], context: BuildContext, typeCheck?: boolean) {
  const changedTypescriptFiles = changedFiles.filter((changedFile) => changedFile.ext === '.ts');
  return runWorker('lint', 'lintUpdateWorker', context, {
    typeCheck,
    tsConfig: getTsConfigPath(context),
    esLintConfig: getUserConfigFile(context, taskInfo, null),
    filePaths: changedTypescriptFiles.map((changedTypescriptFile) => changedTypescriptFile.filePath)
  });
}

export async function lintUpdateWorker(context: BuildContext, { filePaths }: LintWorkerConfig) {
  const program = createTsProgram(context);
  const logger = new Logger('lint update');
  await lintFiles(context, program, filePaths);
  logger.finish();
}

function lintApp(context: BuildContext) {
  const program = createTsProgram(context);
  return lintFiles(context, program);
}

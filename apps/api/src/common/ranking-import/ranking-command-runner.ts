import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { INestApplicationContext, LogLevel, Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

export function isMainModule(moduleUrl: string): boolean {
  const commandPath = process.argv[1];
  return (
    commandPath !== undefined &&
    resolve(commandPath) === fileURLToPath(moduleUrl)
  );
}

/**
 * 랭킹 CLI 커맨드들이 공유하는 NestFactory 부트스트랩/종료 처리.
 * 실패 메시지에는 원인을 담지 않는다 - 디렉터리 경로 등 민감할 수 있는
 * 값이 로그로 새는 것을 막기 위해서다(기존 커맨드들의 동작을 그대로 유지).
 */
export async function runRankingCommand<
  TModules extends { AppModule: Type<unknown> },
>(
  commandLabel: string,
  loggerOption: false | LogLevel[],
  loadModules: () => Promise<TModules>,
  body: (app: INestApplicationContext, modules: TModules) => Promise<number>,
): Promise<void> {
  let app: INestApplicationContext | undefined;

  try {
    const modules = await loadModules();
    app = await NestFactory.createApplicationContext(modules.AppModule, {
      logger: loggerOption,
    });
    const exitCode = await body(app, modules);
    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error(`${commandLabel} failed.`);
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error(`${commandLabel} shutdown failed.`);
        process.exitCode = 1;
      }
    }
  }
}

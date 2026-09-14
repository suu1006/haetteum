import { execSync } from "node:child_process";
import net from "node:net";

import { config } from "dotenv";

config();

const port = Number(process.env.API_PORT ?? 4000);

function isPortFree(candidate) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(candidate, "0.0.0.0");
  });
}

function findListeningPids(candidate) {
  try {
    return execSync(`lsof -ti tcp:${candidate}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

if (!(await isPortFree(port))) {
  const pids = findListeningPids(port);
  const detail = pids.length
    ? `\n  점유 중인 프로세스: PID ${pids.join(", ")}\n  종료: kill ${pids.join(" ")}`
    : "";
  console.error(
    `\n[check-dev-port] ${port} 포트가 이미 사용 중입니다. 기존/중복 API dev 서버가 남아있을 수 있습니다.${detail}\n  위 프로세스를 정리한 뒤 다시 실행해 주세요.\n`,
  );
  process.exit(1);
}

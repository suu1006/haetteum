import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

import type { ApiEnvironment } from "../config/environment.js";

@Injectable()
export class VerificationMailService {
  private readonly logger = new Logger(VerificationMailService.name);
  private transporter: Transporter | null | undefined = undefined;

  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log(
        `SMTP가 설정되지 않아 인증번호를 로그로만 출력합니다: ${email} -> ${code}`,
      );
      return;
    }

    await transporter.sendMail({
      from: this.config.get("SMTP_FROM", { infer: true }),
      to: email,
      subject: "[해뜸] 이메일 인증번호",
      text: `인증번호는 ${code} 입니다. 3분 이내에 입력해주세요.`,
    });
  }

  private getTransporter(): Transporter | null {
    if (this.transporter !== undefined) return this.transporter;

    const host = this.config.get("SMTP_HOST", { infer: true });
    const port = this.config.get("SMTP_PORT", { infer: true });
    if (!host || !port) {
      this.transporter = null;
      return this.transporter;
    }

    const user = this.config.get("SMTP_USER", { infer: true });
    const pass = this.config.get("SMTP_PASS", { infer: true });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
    });

    return this.transporter;
  }
}

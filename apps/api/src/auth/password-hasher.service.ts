import bcrypt from "bcrypt";
import { Injectable } from "@nestjs/common";

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}

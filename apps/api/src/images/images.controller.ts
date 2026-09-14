import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import type { Response } from "express";
import { ImagesService } from "./images.service.js";

@Controller({ path: "images", version: "1" })
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get(":id")
  async read(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const data = await this.images.read(id);
    response.set({
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    });
    response.send(data);
  }
}

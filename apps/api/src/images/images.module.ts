import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ImageProcessor } from "./image-processor.js";
import { ImagesController } from "./images.controller.js";
import { ImagesService } from "./images.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [ImagesController],
  providers: [ImageProcessor, ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}

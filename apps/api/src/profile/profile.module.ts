import { ImagesModule } from "../images/images.module.js";
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { ProfilePhotoStorageService } from "./profile-photo-storage.service.js";
import { ProfileController } from "./profile.controller.js";
import { ProfileService } from "./profile.service.js";

@Module({
  imports: [AuthModule, ImagesModule],
  controllers: [ProfileController],
  providers: [ProfileService, ProfilePhotoStorageService],
})
export class ProfileModule {}

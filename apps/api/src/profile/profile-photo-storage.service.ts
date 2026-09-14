import { Injectable } from "@nestjs/common";
import { ImagesService } from "../images/images.service.js";

@Injectable()
export class ProfilePhotoStorageService {
  constructor(private readonly images: ImagesService) {}

  store(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ profileImageUrl: string }> {
    return this.images.storeProfile(userId, file);
  }
}

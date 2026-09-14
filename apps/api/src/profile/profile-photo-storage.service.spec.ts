import { describe, expect, it, jest } from "@jest/globals";
import type { ImagesService } from "../images/images.service.js";
import { ProfilePhotoStorageService } from "./profile-photo-storage.service.js";

describe("ProfilePhotoStorageService", () => {
  it("persists the upload and profile link through the shared transactional service", async () => {
    const storeProfile = jest
      .fn<ImagesService["storeProfile"]>()
      .mockResolvedValue({
        profileImageUrl:
          "https://haetteum.kr/api/v1/images/10000000-0000-4000-8000-000000000001",
      });
    const service = new ProfilePhotoStorageService({
      storeProfile,
    } as unknown as ImagesService);
    const file = { buffer: Buffer.from("image") } as Express.Multer.File;
    expect(await service.store("owner", file)).toEqual({
      profileImageUrl:
        "https://haetteum.kr/api/v1/images/10000000-0000-4000-8000-000000000001",
    });
    expect(storeProfile).toHaveBeenCalledWith("owner", file);
  });
});

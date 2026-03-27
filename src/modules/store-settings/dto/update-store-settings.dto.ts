import { IsBoolean } from "class-validator";

export class UpdateStoreSettingsDto {
  @IsBoolean()
  isStoreOpen: boolean;
}

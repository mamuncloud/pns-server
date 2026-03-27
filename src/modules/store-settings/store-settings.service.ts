import { Injectable, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import { UpdateStoreSettingsDto } from "./dto/update-store-settings.dto";
import { DRIZZLE_DB } from "../../common/database/database.module";

@Injectable()
export class StoreSettingsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getSettings() {
    let settings = await this.db.query.storeSettings.findFirst();
    if (!settings) {
      const [newSettings] = await this.db.insert(schema.storeSettings).values({
        isStoreOpen: true,
      }).returning();
      settings = newSettings;
    }
    return settings;
  }

  async updateSettings(updateDto: UpdateStoreSettingsDto) {
    const settings = await this.db.query.storeSettings.findFirst();
    
    if (!settings) {
      const [newSettings] = await this.db.insert(schema.storeSettings).values({
        isStoreOpen: updateDto.isStoreOpen,
      }).returning();
      return newSettings;
    }

    const [updatedSettings] = await this.db.update(schema.storeSettings)
      .set({ isStoreOpen: updateDto.isStoreOpen })
      .where(eq(schema.storeSettings.id, settings!.id as string))
      .returning();
      
    return updatedSettings;
  }
}

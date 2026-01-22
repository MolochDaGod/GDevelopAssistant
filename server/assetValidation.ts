import { z } from "zod";
import { createHash, randomUUID } from "crypto";

export const ASSET_RULES = {
  maxFileSizeMB: 50,
  maxBatchSizeMB: 500,
  allowedExtensions: {
    models: [".glb", ".gltf", ".fbx", ".obj"],
    textures: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".tga", ".bmp"],
    audio: [".mp3", ".ogg", ".wav", ".m4a"],
    animations: [".json", ".glb"],
    maps: [".json", ".tmx", ".tmj"],
  },
  categories: ["models", "textures", "audio", "animations", "maps", "misc"] as const,
  subcategories: {
    models: ["characters", "buildings", "weapons", "props", "vehicles", "nature", "misc"],
    textures: ["terrain", "ui", "effects", "materials", "skybox", "misc"],
    audio: ["music", "sfx", "ambient", "ui", "voice"],
    animations: ["character", "object", "camera", "misc"],
    maps: ["2d", "3d", "tiled", "heightmap"],
    misc: ["misc"],
  } as Record<string, string[]>,
  licenses: ["cc0", "cc-by", "cc-by-sa", "cc-by-nc", "personal", "commercial", "unknown"] as const,
  sources: ["kenney", "kaykit", "opengameart", "itch", "imgur", "user-upload", "ai-generated", "custom"] as const,
  folderStructure: {
    models: "game-assets/models",
    textures: "game-assets/textures",
    audio: "game-assets/audio",
    animations: "game-assets/animations",
    maps: "game-assets/maps",
    misc: "game-assets/misc",
  } as Record<string, string>,
};

export type AssetCategory = typeof ASSET_RULES.categories[number];
export type AssetLicense = typeof ASSET_RULES.licenses[number];
export type AssetSource = typeof ASSET_RULES.sources[number];

export const assetUploadSchema = z.object({
  filename: z.string().min(1),
  category: z.enum(ASSET_RULES.categories),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  source: z.enum(ASSET_RULES.sources).optional().default("user-upload"),
  sourceUrl: z.string().url().optional(),
  license: z.enum(ASSET_RULES.licenses).optional().default("unknown"),
});

export type AssetUploadRequest = z.infer<typeof assetUploadSchema>;

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  category?: AssetCategory;
  subcategory?: string;
  folder?: string;
}

export function detectCategoryFromExtension(filename: string): AssetCategory {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const dotExt = `.${ext}`;
  
  for (const [category, extensions] of Object.entries(ASSET_RULES.allowedExtensions)) {
    if (extensions.includes(dotExt)) {
      return category as AssetCategory;
    }
  }
  return "misc";
}

export function validateAssetUpload(
  filename: string,
  fileSizeBytes: number,
  requestedCategory?: string,
  requestedSubcategory?: string
): AssetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const ext = filename.toLowerCase().split(".").pop() || "";
  const dotExt = `.${ext}`;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  
  const allExtensions = Object.values(ASSET_RULES.allowedExtensions).flat();
  if (!allExtensions.includes(dotExt)) {
    errors.push(`File type .${ext} is not allowed. Allowed: ${allExtensions.join(", ")}`);
  }
  
  if (fileSizeMB > ASSET_RULES.maxFileSizeMB) {
    errors.push(`File size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${ASSET_RULES.maxFileSizeMB}MB`);
  }
  
  const detectedCategory = detectCategoryFromExtension(filename);
  const category = (requestedCategory as AssetCategory) || detectedCategory;
  
  if (requestedCategory && requestedCategory !== detectedCategory) {
    warnings.push(`File extension suggests category "${detectedCategory}" but "${requestedCategory}" was requested`);
  }
  
  if (!ASSET_RULES.categories.includes(category)) {
    errors.push(`Invalid category: ${category}. Valid: ${ASSET_RULES.categories.join(", ")}`);
  }
  
  let subcategory = requestedSubcategory;
  if (subcategory && ASSET_RULES.subcategories[category]) {
    if (!ASSET_RULES.subcategories[category].includes(subcategory)) {
      warnings.push(`Subcategory "${subcategory}" is not standard for ${category}. Standard: ${ASSET_RULES.subcategories[category].join(", ")}`);
    }
  }
  
  const folder = subcategory 
    ? `${ASSET_RULES.folderStructure[category]}/${subcategory}`
    : ASSET_RULES.folderStructure[category];
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    category,
    subcategory,
    folder,
  };
}

export function generateAssetHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function generateStoragePath(filename: string, folder: string): { storagePath: string; uuid: string } {
  const uuid = randomUUID().slice(0, 8);
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${folder}/${uuid}_${sanitizedName}`;
  return { storagePath, uuid };
}

export function extractFileMetadata(filename: string, buffer: Buffer): {
  fileType: string;
  fileSize: number;
  contentHash: string;
} {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return {
    fileType: ext,
    fileSize: buffer.length,
    contentHash: generateAssetHash(buffer),
  };
}

export function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const contentTypes: Record<string, string> = {
    glb: "model/gltf-binary",
    gltf: "model/gltf+json",
    fbx: "application/octet-stream",
    obj: "model/obj",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    tga: "image/x-tga",
    bmp: "image/bmp",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    json: "application/json",
    tmx: "application/xml",
    tmj: "application/json",
  };
  return contentTypes[ext] || "application/octet-stream";
}

export function autoTagAsset(filename: string, category: AssetCategory): string[] {
  const tags: string[] = [category];
  const nameLower = filename.toLowerCase();
  
  const tagPatterns: Record<string, string[]> = {
    character: ["character", "player", "npc", "enemy", "hero", "villain"],
    weapon: ["weapon", "sword", "bow", "axe", "gun", "staff", "wand"],
    building: ["building", "house", "castle", "tower", "wall", "door"],
    terrain: ["terrain", "ground", "grass", "rock", "mountain", "water"],
    ui: ["ui", "button", "icon", "menu", "hud"],
    medieval: ["medieval", "knight", "castle", "fantasy"],
    scifi: ["scifi", "robot", "space", "laser", "cyber"],
    nature: ["tree", "plant", "flower", "bush", "forest"],
    vehicle: ["car", "truck", "ship", "plane", "vehicle"],
  };
  
  for (const [tag, patterns] of Object.entries(tagPatterns)) {
    if (patterns.some(p => nameLower.includes(p))) {
      tags.push(tag);
    }
  }
  
  return Array.from(new Set(tags));
}

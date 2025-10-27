// ✅ Tipe kategori utama MIME
export type MimeCategory = "image" | "video" | "audio" | "document" | "archive" | "other";

// ✅ Struktur detail MIME
export interface MimeDetail {
  type: string;
  category: MimeCategory;
  exampleMime: string[];
  extensions: string[];
}

// ✅ Full list mimetype yang bisa dikembangkan
export const MimeMap: Record<string, MimeDetail> = {
  image: {
    type: "image",
    category: "image",
    exampleMime: ["image/jpeg", "image/png", "image/gif"],
    extensions: ["jpg", "jpeg", "png", "gif", "webp"]
  },
  video: {
    type: "video",
    category: "video",
    exampleMime: ["video/mp4", "video/mkv", "video/webm"],
    extensions: ["mp4", "mkv", "avi", "mov", "webm"]
  },
  audio: {
    type: "audio",
    category: "audio",
    exampleMime: ["audio/mpeg", "audio/wav", "audio/aac"],
    extensions: ["mp3", "wav", "aac", "ogg", "flac"]
  },
  document: {
    type: "application",
    category: "document",
    exampleMime: ["application/pdf", "application/msword"],
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"]
  },
  archive: {
    type: "application",
    category: "archive",
    exampleMime: ["application/zip", "application/x-rar-compressed"],
    extensions: ["zip", "rar", "7z", "tar", "gz"]
  }
};

// ✅ Ambil semua ekstensi valid
const allExtensions = Object.values(MimeMap).flatMap(m => m.extensions);

// ✅ Type Guard untuk menghindari "never"
export function isFileExtension(ext: string): ext is (typeof allExtensions)[number] {
  return allExtensions.includes(ext as any);
}

// ✅ Class utama
export class MimeType {
  private input: string;
  private ext?: string;
  private type?: string;

  constructor(input: string) {
    this.input = input.toLowerCase().trim();
    this.parseInput();
  }

  private parseInput() {
    if (this.input.includes("/")) {
      const [type, ext] = this.input.split("/");
      this.type = type;
      this.ext = ext;
    } else if (isFileExtension(this.input.replace(/^\./, ""))) {
      this.ext = this.input.replace(/^\./, "");
      this.type = Object.values(MimeMap).find(m => m.extensions.includes(this.ext!))?.type;
    }
  }

  // ✅ Dapatkan MIME Type lengkap: "image/png"
  getType(): string | undefined {
    if (this.type && this.ext) return `${this.type}/${this.ext}`;
    return undefined;
  }

  // ✅ Dapatkan ekstensi yang digunakan
  getExtension(): string | undefined {
    return this.ext;
  }

  // ✅ Semua ekstensi dalam grup/type
  getExtensions(): string[] | undefined {
    const cat = this.getCategory();
    if (!cat) return;
    return MimeMap[cat]?.extensions;
  }

  // ✅ Ambil kategori: "image", "video", dll.
  getCategory(): MimeCategory | undefined {
    if (this.type) {
      const found = Object.values(MimeMap).find(m => m.type === this.type);
      return found?.category;
    }
    if (this.ext) {
      const found = Object.values(MimeMap).find(m => m.extensions.includes(this.ext!));
      return found?.category;
    }
    return undefined;
  }

  // ✅ Check cepat berdasarkan kategori
  isImage() { return this.getCategory() === "image"; }
  isVideo() { return this.getCategory() === "video"; }
  isAudio() { return this.getCategory() === "audio"; }
  isDocument() { return this.getCategory() === "document"; }
  isArchive() { return this.getCategory() === "archive"; }
}

// ✅ Export default agar bisa: import MimeType from "./..."
export default MimeType;

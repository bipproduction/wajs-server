import fs from "fs";
import { parse, stringify } from "yaml";

export interface LogRotateOptions {
    maxSize?: string;
    maxFile?: string;
}

/**
 * Tambahkan log rotate (logging.driver json-file) ke semua service
 * yang belum memiliki konfigurasi logging di docker-compose.yml.
 */
export async function applyLogRotateCompose(
    filePath: string,
    options: LogRotateOptions = {}
) {
    const { maxSize = "10m", maxFile = "3" } = options;

    // Pastikan file ada
    if (!fs.existsSync(filePath)) {
        throw new Error(`❌ File not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const compose = parse(raw); // ✅ Pakai yaml.parse()

    if (!compose.services) {
        throw new Error("❌ Tidak ditemukan 'services:' di docker-compose.yml");
    }

    let modified = false;

    for (const [name, service] of Object.entries<any>(compose.services)) {
        if (!service.logging) {
            service.logging = {
                driver: "json-file",
                options: {
                    "max-size": maxSize,
                    "max-file": maxFile,
                },
            };
            console.log(`✅ Log rotate ditambahkan ke: ${name}`);
            modified = true;
        } else {
            console.log(`⚠️  Lewati (sudah ada logging): ${name}`);
        }
    }

    if (!modified) {
        console.log("👌 Semua service sudah punya log-rotate, tidak ada perubahan.");
        return;
    }

    // Backup file lama
    const backupPath = `${filePath}.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, raw, "utf8");

    // Simpan file baru
    const updated = stringify(compose); // ✅ Pakai yaml.stringify()
    fs.writeFileSync(filePath, updated, "utf8");

    console.log(`✅ Selesai update file: ${filePath}`);
    console.log(`📦 Backup dibuat: ${backupPath}`);
}

applyLogRotateCompose("compose.yml");

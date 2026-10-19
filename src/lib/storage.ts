import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";

/**
 * Returns an authenticated Supabase admin client using the service role key.
 * Only callable in server contexts.
 */
export function getStorageAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production."
      );
    }

    // In dev / test mode, if credentials are missing and test mock is requested:
    if (process.env.TEST_MOCK_STORAGE === "true") {
      // Return a simulated client for headless test scripts
      return createMockStorageClient();
    }

    throw new Error(
      "Supabase storage credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Inspect file magic bytes to verify actual image format
 * Prevents disguised executables (e.g. mal.exe renamed to shoes.jpg).
 */
export function verifyImageMagicBytes(buffer: Uint8Array): {
  valid: boolean;
  detectedType?: string;
  error?: string;
} {
  if (buffer.length < 2) {
    return { valid: false, error: "Buffer too short to determine file header" };
  }

  // Windows EXE magic bytes: 'MZ' (0x4D, 0x5A)
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return {
      valid: false,
      detectedType: "application/x-msdownload",
      error: "Executable binary (MZ header) detected",
    };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  return { valid: false, error: "Unrecognized or corrupted file format header" };
}

/**
 * Generate a cryptographically secure, server-enforced upload path and signed URL.
 * NEVER allows client-selected file paths.
 */
export async function createSignedUploadUrl(
  productId: string,
  fileName: string,
  declaredContentType: string
) {
  // 1. Validate Product ID
  if (!productId || typeof productId !== "string" || productId.trim() === "") {
    throw new Error("Invalid product ID.");
  }

  // 2. Validate declared content type
  if (!ALLOWED_MIME_TYPES.includes(declaredContentType as AllowedMimeType)) {
    throw new Error(
      `Unsupported file type: "${declaredContentType}". Allowed formats: JPEG, PNG, WebP.`
    );
  }

  // 3. Validate and extract file extension
  const cleanFileName = fileName.toLowerCase().trim();
  const lastDotIndex = cleanFileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    throw new Error("File must have a valid extension (.jpg, .png, .webp).");
  }

  const ext = cleanFileName.slice(lastDotIndex);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error(`Forbidden file extension "${ext}". Allowed: .jpg, .jpeg, .png, .webp.`);
  }

  // Ensure content-type matches extension
  if (ext === ".png" && declaredContentType !== "image/png") {
    throw new Error("Extension .png does not match declared content type.");
  }
  if ((ext === ".jpg" || ext === ".jpeg") && declaredContentType !== "image/jpeg") {
    throw new Error("Extension .jpg does not match declared content type.");
  }
  if (ext === ".webp" && declaredContentType !== "image/webp") {
    throw new Error("Extension .webp does not match declared content type.");
  }

  // 4. Server-generated random UUID path
  const uuid = crypto.randomUUID();
  const storagePath = `${productId}/${uuid}${ext}`;

  // 5. Generate signed upload URL from Supabase Storage
  const supabase = getStorageAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(`Failed to generate signed upload URL: ${error?.message || "Unknown error"}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
    publicUrl: publicData.publicUrl,
  };
}

/**
 * Hardened verification of uploaded file in Supabase Storage.
 * Verifies:
 *  - Path strictly begins with productId/
 *  - File exists in storage
 *  - File size is <= 5MB and > 0
 *  - File content type is one of image/jpeg, image/png, image/webp
 *  - Actual file magic bytes match expected image headers (catches renamed .exe)
 * Deletes the file if any verification fails.
 */
export async function verifyAndInspectUploadedImage(
  productId: string,
  storagePath: string
) {
  const supabase = getStorageAdminClient();

  // 1. Path isolation check
  if (!storagePath.startsWith(`${productId}/`)) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error("Security violation: Storage path does not belong to this product.");
  }

  // 2. Download file to inspect actual byte content & headers
  const { data: blob, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error || !blob) {
    throw new Error("Uploaded file could not be retrieved from storage.");
  }

  // 3. Verify Size
  if (blob.size <= 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error("Uploaded file is empty (0 bytes).");
  }

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(
      `File size (${(blob.size / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB.`
    );
  }

  // 4. Verify MIME and Magic Bytes
  const arrayBuffer = await blob.arrayBuffer();
  const uint8View = new Uint8Array(arrayBuffer);
  const inspection = verifyImageMagicBytes(uint8View);

  if (!inspection.valid || !inspection.detectedType) {
    // Malicious or corrupted file detected: delete immediately
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(
      `Security violation: File header does not match a valid image format. Detected: "${
        inspection.detectedType || "unknown"
      }".`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(inspection.detectedType as AllowedMimeType)) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Disallowed image format: ${inspection.detectedType}`);
  }

  // 5. Retrieve public URL
  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    verified: true,
    size: blob.size,
    contentType: inspection.detectedType,
    publicUrl: publicData.publicUrl,
  };
}

/**
 * Delete a file from Supabase storage by its storage path or public URL.
 */
export async function deleteStorageImage(storagePathOrUrl: string) {
  const supabase = getStorageAdminClient();

  let storagePath = storagePathOrUrl;
  // If a full public URL was provided, extract the path after the bucket name
  if (storagePathOrUrl.startsWith("http")) {
    const bucketMarker = `/${STORAGE_BUCKET}/`;
    const markerIndex = storagePathOrUrl.indexOf(bucketMarker);
    if (markerIndex !== -1) {
      storagePath = storagePathOrUrl.substring(markerIndex + bucketMarker.length);
    }
  }

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) {
    console.error("[deleteStorageImage] Error deleting file from storage:", error);
  }
}

// -----------------------------------------------------------------------------
// In-Memory Mock Client for Isolated Test Scripts (Strictly blocked in production)
// -----------------------------------------------------------------------------
const memoryStorage = new Map<string, { buffer: Uint8Array; contentType: string }>();

function createMockStorageClient(): SupabaseClient {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock storage is strictly forbidden in production.");
  }

  return {
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => {
          return {
            data: {
              signedUrl: `https://mock.storage.local/upload/${path}`,
              token: "mock-token",
              path,
            },
            error: null,
          };
        },
        download: async (path: string) => {
          const item = memoryStorage.get(path);
          if (!item) {
            // Return a valid dummy JPEG buffer for tests if not explicitly set
            const dummyJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
            return {
              data: new Blob([dummyJpeg as unknown as BlobPart], { type: "image/jpeg" }),
              error: null,
            };
          }
          return {
            data: new Blob([item.buffer as unknown as BlobPart], { type: item.contentType }),
            error: null,
          };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) {
            memoryStorage.delete(p);
          }
          return { data: paths, error: null };
        },
        getPublicUrl: (path: string) => {
          return {
            data: {
              publicUrl: `https://images.unsplash.com/photo-mock/${path}`,
            },
          };
        },
      }),
    },
  } as unknown as SupabaseClient;
}

export function setMockStorageFile(path: string, buffer: Uint8Array, contentType: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock storage is forbidden in production.");
  }
  memoryStorage.set(path, { buffer, contentType });
}

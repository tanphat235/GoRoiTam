import { z } from "zod";
import { loadAvatar } from "@/server/avatar";

/** Serves an avatar by its random key. Each upload gets a new key, so responses can be cached forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!z.string().uuid().safeParse(key).success) return new Response(null, { status: 404 });
  const data = await loadAvatar(key);
  if (!data) return new Response(null, { status: 404 });
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Opened directly, the image cannot run anything.
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

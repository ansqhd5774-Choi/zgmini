import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

const validTypes = new Set(["global", "sector", "theme"]);

function storageError(error: unknown) {
  const message = error instanceof Error ? error.message : "즐겨찾기 저장소를 사용할 수 없습니다.";
  if (message.includes("no such table")) return "즐겨찾기 저장 준비가 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.";
  return "즐겨찾기를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const result = await env.DB
      .prepare(
        "SELECT item_key AS itemKey, item_type AS itemType, item_name AS itemName, created_at AS createdAt FROM favorite_sentiments WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(user.userId)
      .all();
    return Response.json({ favorites: result.results });
  } catch (error) {
    return Response.json({ error: storageError(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const payload = (await request.json()) as { itemKey?: string; itemType?: string; itemName?: string };
  const itemKey = payload.itemKey?.trim() ?? "";
  const itemType = payload.itemType?.trim() ?? "";
  const itemName = payload.itemName?.trim() ?? "";
  if (!itemKey || !itemName || !validTypes.has(itemType) || itemKey.length > 120 || itemName.length > 80) {
    return Response.json({ error: "올바르지 않은 즐겨찾기 항목입니다." }, { status: 400 });
  }

  try {
    await env.DB
      .prepare(
        "INSERT INTO favorite_sentiments (user_id, item_key, item_type, item_name) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, item_key) DO UPDATE SET item_type = excluded.item_type, item_name = excluded.item_name"
      )
      .bind(user.userId, itemKey, itemType, itemName)
      .run();
    return Response.json({ favorite: { itemKey, itemType, itemName } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: storageError(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const itemKey = new URL(request.url).searchParams.get("itemKey")?.trim() ?? "";
  if (!itemKey) return Response.json({ error: "삭제할 항목이 없습니다." }, { status: 400 });

  try {
    await env.DB
      .prepare("DELETE FROM favorite_sentiments WHERE user_id = ? AND item_key = ?")
      .bind(user.userId, itemKey)
      .run();
    return Response.json({ removed: itemKey });
  } catch (error) {
    return Response.json({ error: storageError(error) }, { status: 503 });
  }
}

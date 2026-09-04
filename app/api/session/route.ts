import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ user: null });

  return Response.json({
    user: {
      displayName: user.displayName,
      email: user.email,
    },
  });
}

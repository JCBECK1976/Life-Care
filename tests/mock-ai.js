// Mock for api.anthropic.com: answers by prompt shape, so tests never spend AI credit.
const ITEM = {
  name: "Test Porridge", kcal: 250, protein: 10, fat: 8, satFat: 2, carbs: 30, fibre: 4, salt: 0.5,
  rating: "AMBER", itemType: "ingredient", ingredients: ["oats 50g", "milk 200ml"],
  suitability: "A filling breakfast.", description: "A filling breakfast.",
};
export const MOCK_TEXT = "Mocked companion reply.";

export function mockReplyFor(body) {
  const prompt = JSON.stringify(body || {});
  let text;
  if (/JSON array/.test(prompt)) {
    text = JSON.stringify([
      { ...ITEM, name: "Test Apple", itemType: "packaged", ingredients: [] },
      { ...ITEM, name: "Test Pear", itemType: "packaged", ingredients: [] },
    ]);
  } else if (/Return ONLY JSON/.test(prompt)) {
    text = JSON.stringify(/Calculate nutritional info for a homemade dish/.test(prompt) ? { ...ITEM, kcal: 321 } : ITEM);
  } else {
    text = MOCK_TEXT;
  }
  return {
    id: "msg_mock", type: "message", role: "assistant", model: "claude-sonnet-4-6",
    content: [{ type: "text", text }], stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  };
}

export async function mockAnthropic(page) {
  const calls = [];
  await page.route("https://api.anthropic.com/**", async (route) => {
    let body = null;
    try { body = route.request().postDataJSON(); } catch {}
    calls.push(body);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockReplyFor(body)) });
  });
  return calls;
}

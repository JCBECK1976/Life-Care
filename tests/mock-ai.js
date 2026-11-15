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
  if (/CLARIFY_ITEM/.test(prompt)) {   // v2.19.0 "Create my own item": a valid per-portion item by default
    text = JSON.stringify({ type: "item", name: "Test Stew", portionDesc: "1 of 4 servings (about 350 g)", portionGrams: 350, servings: 4, ingredients: ["beef 500g", "veg 400g"], assumptions: "",
      perPortion: { kcal: 320, protein: 28, fat: 12, satFat: 4, carbs: 24, sugar: 6, addedSugar: 0, fibre: 5, salt: 1.1 } });
  } else if (/JSON array/.test(prompt)) {
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

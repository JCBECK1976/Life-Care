// Every test mocks the Claude API so tests never spend AI credit.
export async function mockAnthropic(page, text = "Mocked companion reply.") {
  await page.route("https://api.anthropic.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "msg_mock", type: "message", role: "assistant", model: "claude-sonnet-4-6",
        content: [{ type: "text", text }], stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      }),
    })
  );
}

export function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const http = require('http');
const { getBrainPrompt } = require('./real_estate_brain');
const { getParkViewContext } = require('./parkview_knowledge');
const demoConfig = require('./demo-config');

const MODEL = 'qwen2.5:0.5b';
const OLLAMA_TIMEOUT = demoConfig.localTimeoutMs;

function askOllama(prompt, history = [], memory = {}) {
  return new Promise((resolve) => {
    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const parkViewContext = getParkViewContext(prompt, 1500);

    const body = JSON.stringify({
      model: MODEL,
      prompt: `
${getBrainPrompt().slice(0, 1200)}

PARK VIEW CITY LAHORE RELEVANT KNOWLEDGE:
${parkViewContext}

CUSTOMER MEMORY:
${JSON.stringify(memory)}

RECENT CONVERSATION:
${recentHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

CUSTOMER MESSAGE:
${String(prompt)}

IMPORTANT:
- Reply naturally and briefly.
- Never invent prices, listings, availability, approvals, NOCs,
  possession, payment plans or legal facts.
- Current prices and inventory require verification.
- WhatsApp reply: normally 1-2 short sentences.

ASSISTANT:
`.trim(),

      stream: false,

      options: {
        temperature: 0.1,
        num_ctx: 256,
        num_predict: 60
      }
    });

    console.log('OLLAMA: sending request...');

    let settled = false;

    const fallback = () => {
      if (settled) return;
      settled = true;

      console.log('OLLAMA: timeout/error - using fallback');

      resolve(
        "I’m unable to give a detailed answer right now. I don’t want to provide inaccurate information."
      );
    };

    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: OLLAMA_TIMEOUT
      },
      response => {
        let data = '';

        console.log('OLLAMA: HTTP', response.statusCode);

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          if (settled) return;

          try {
            const result = JSON.parse(data);

            if (result.error) {
              fallback();
              return;
            }

            const answer = result.response?.trim();

            if (!answer) {
              fallback();
              return;
            }

            settled = true;
            resolve(answer);
          } catch {
            fallback();
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      fallback();
    });

    request.on('error', fallback);

    request.write(body);
    request.end();
  });
}

module.exports = { askOllama };

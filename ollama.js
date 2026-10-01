const http = require('http');

const MODEL = 'qwen2.5:0.5b';
const OLLAMA_TIMEOUT = 30000;

function askOllama(prompt, history = [], memory = {}) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: MODEL,
      prompt: String(prompt),
      stream: false,
      options: {
        temperature: 0,
        num_ctx: 256,
        num_predict: 25
      }
    });

    console.log('OLLAMA: sending request...');

    let settled = false;

    function fallback() {
      if (settled) return;
      settled = true;
      console.log('OLLAMA: timeout/error - using fallback');
      resolve(
        "I’m unable to give a detailed answer right now. I don’t want to provide inaccurate information."
      );
    }

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

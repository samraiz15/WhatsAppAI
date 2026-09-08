const http = require('http');

const MODEL = 'qwen2.5:0.5b';

function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2
      }
    });

    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const result = JSON.parse(data);

            if (result.error) {
              reject(new Error(result.error));
              return;
            }

            const answer = result.response?.trim();

            if (!answer) {
              reject(new Error('Empty Ollama response'));
              return;
            }

            const blocked = /\b(qwen|ollama|alibaba cloud|language model|ai model)\b/i;

            if (blocked.test(answer)) {
              reject(new Error('Invalid white-label response'));
              return;
            }

            resolve(answer);
          } catch {
            reject(new Error('Invalid Ollama response'));
          }
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

module.exports = { askOllama };

const http = require('http');

const MODEL = 'qwen2.5:0.5b';

function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      prompt,
      stream: false
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

            resolve(result.response.trim());
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

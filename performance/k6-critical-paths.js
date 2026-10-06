import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const authToken = __ENV.AUTH_TOKEN || '';
const profile = (__ENV.PROFILE || 'load').toLowerCase();

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  stages: profile === 'smoke'
    ? [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 0 },
      ]
    : profile === 'stress'
      ? [
          { duration: '1m', target: 10 },
          { duration: '2m', target: 50 },
          { duration: '2m', target: 100 },
          { duration: '2m', target: 150 },
          { duration: '1m', target: 0 },
        ]
      : [
          { duration: '1m', target: 10 },
          { duration: '2m', target: 50 },
          { duration: '2m', target: 100 },
          { duration: '1m', target: 0 },
        ],
};

const checks = new Rate('tomato_checks');

function get(path, headers = {}) {
  const response = http.get(`${baseUrl}${path}`, { headers, tags: { path } });
  checks.add(check(response, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  }));
  return response;
}

export default function () {
  // Health checks are intentionally public and make this harness safe to run
  // without credentials. Authenticated traffic is opt-in via AUTH_TOKEN.
  get('/health');

  if (authToken) {
    get('/api/orders/my-orders', {
      Authorization: `Bearer ${authToken}`,
    });
  }

  sleep(1);
}

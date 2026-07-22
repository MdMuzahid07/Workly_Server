import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api/v1';

async function verifyAudit() {
  try {
    console.log('--- Section 1 & 2: Route Entitlement Verification ---\n');

    // 1. Authenticate / Login to get a token for a Free tier user or Seeker
    // We need to know a test user email. Let's try the job seeker seed user.
    const loginRes = await axios
      .post(`${BASE_URL}/auth/login`, {
        email: 'seeker@gmail.com', // Let's guess the seed email, or we'll create one
        password: 'password123',
      })
      .catch((e) => e.response);

    let token = loginRes?.data?.data?.accessToken;

    if (!token) {
      // If we couldn't login, let's create a user
      console.log('Login failed, attempting to register a new user...');
      const regRes = await axios
        .post(`${BASE_URL}/auth/register`, {
          firstName: 'Audit',
          lastName: 'User',
          email: `audit.seeker.${Date.now()}@test.com`,
          password: 'Password123!',
          role: 'JOB_SEEKER',
        })
        .catch((e) => e.response);

      token = regRes?.data?.data?.accessToken;
      if (!token) {
        console.error('Registration also failed. Output:', regRes?.data);
        return;
      }
      console.log('Successfully registered test user.');
    } else {
      console.log('Successfully logged in as test user.');
    }

    const headers = { Authorization: token };

    // Now let's hit the endpoints mentioned in Section 1
    const endpoints = [
      { name: 'maxActiveJobs', method: 'post', url: '/jobs/create-job', body: {} },
      { name: 'maxUsers', method: 'post', url: '/companies/add-team-member/dummyId', body: {} },
      { name: 'canViewAnalytics', method: 'get', url: '/companies/analytics/dummyId' },
      { name: 'canViewProfileAnalytics', method: 'get', url: '/profile-views/analytics' },
      {
        name: 'maxMonthlyApplications',
        method: 'post',
        url: '/applications/apply',
        body: { jobId: 'dummy' },
      },
      { name: 'maxResumes', method: 'post', url: '/resumes/upload', body: {} },
      { name: 'canMessage (getConversations)', method: 'get', url: '/messages/conversations' },
    ];

    for (const ep of endpoints) {
      console.log(`\nTesting ${ep.name} entitlement via ${ep.method.toUpperCase()} ${ep.url}...`);
      let res;
      if (ep.method === 'post') {
        res = await axios.post(`${BASE_URL}${ep.url}`, ep.body, {
          headers,
          validateStatus: () => true,
        });
      } else {
        res = await axios.get(`${BASE_URL}${ep.url}`, { headers, validateStatus: () => true });
      }

      console.log(`Status Code: ${res.status}`);
      console.log(`Response Body: ${JSON.stringify(res.data, null, 2)}`);
    }
  } catch (err: any) {
    console.error('Error during verification:', err.message);
  }
}

verifyAudit();

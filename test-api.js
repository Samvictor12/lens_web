import jwt from 'jsonwebtoken';

async function main() {
  const JWT_SECRET = "your-super-secret-jwt-key-for-lens-project-2025";
  const token = jwt.sign(
    { userId: 1, username: 'admin123' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'lens-management', audience: 'lens-users' }
  );

  try {
    const url = 'http://localhost:3001/api/inventory/stock-grouped?page=1&limit=10&groupBy=none&search=';
    console.log("Fetching URL:", url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("Status:", response.status);
    const body = await response.json();
    console.log("Response Body:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main();

/**
 * Simple test to check if the backend is running and test login
 */

const BASE_URL = "http://localhost:5000/api";

async function testLogin() {
    try {
        console.log("Testing login...");
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Device": "Web"
            },
            body: JSON.stringify({
                username: "admin",
                password: "demo123"
            })
        });
        
        const data = await response.json();
        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log("\n✅ Login successful!");
            console.log("Token:", data.data.accessToken);
            return data.data.accessToken;
        } else {
            console.log("\n❌ Login failed");
            return null;
        }
    } catch (error) {
        console.error("Error:", error.message);
        return null;
    }
}

testLogin();

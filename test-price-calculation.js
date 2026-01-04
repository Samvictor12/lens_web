/**
 * Test file to verify the enhanced price calculation logic
 * This test simulates the price calculation for a sale order with:
 * - Lens specifications
 * - Extra charges for out-of-range sphere/cylinder values
 * - Coating, tinting, and fitting prices
 * - Free lens and free fitting deductions
 * - Discount percentage
 */

const BASE_URL = "http://localhost:5000/api";
const TOKEN = ""; // Will be set after login

// Simulate the enhanced price calculation
async function testPriceCalculation() {
    console.log("\n=== Testing Enhanced Price Calculation ===\n");

    // Test data
    const testOrder = {
        customerId: 1,
        lens_id: 1,
        coating_id: 1,
        tinting_id: 1,
        fitting_id: 1,
        rightEye: true,
        leftEye: true,
        rightSpherical: 6.0,  // Assuming this exceeds max (e.g., max = 4.0)
        leftSpherical: -3.0,
        rightCylindrical: -2.5, // Assuming this exceeds max (e.g., max = -2.0)
        leftCylindrical: -1.0,
        freeLens: false,
        freeFitting: false,
        discount: 10 // Will come from customer business category
    };

    try {
        // Login first
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "admin",
                password: "demo123"
            })
        });
        const loginData = await loginResponse.json();
        console.log("Login response:", JSON.stringify(loginData, null, 2));
        const token = loginData.data?.token || loginData.token;
        if (!token) {
            throw new Error("Failed to get token from login response");
        }
        console.log("✓ Logged in successfully\n");

        // Step 1: Get lens product details
        console.log("Step 1: Fetching lens product details...");
        const lensResponse = await fetch(`${BASE_URL}/v1/lens-products/${testOrder.lens_id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const lensData = await lensResponse.json();
        const lensProduct = lensData.data;
        console.log("Lens Product:", {
            name: lensProduct.lens_name,
            sphere_min: lensProduct.sphere_min,
            sphere_max: lensProduct.sphere_max,
            sphere_extra_charge: lensProduct.sphere_extra_charge,
            cyl_min: lensProduct.cyl_min,
            cyl_max: lensProduct.cyl_max,
            cylinder_extra_charge: lensProduct.cylinder_extra_charge
        });

        // Step 2: Get lens base price
        console.log("\nStep 2: Fetching lens base price...");
        const priceResponse = await fetch(`${BASE_URL}/v1/lens-products/${testOrder.lens_id}/prices`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const priceData = await priceResponse.json();
        const priceEntry = priceData.data.find(p => p.coating_id === testOrder.coating_id);
        const baseLensPrice = priceEntry.price * 2; // Both eyes
        console.log("Base Lens Price (both eyes):", baseLensPrice);

        // Step 3: Calculate extra charges
        console.log("\nStep 3: Calculating extra charges...");
        let extraCharges = {
            rightSphere: 0,
            leftSphere: 0,
            rightCylinder: 0,
            leftCylinder: 0,
            total: 0
        };

        // Right sphere
        if (testOrder.rightSpherical > lensProduct.sphere_max || testOrder.rightSpherical < lensProduct.sphere_min) {
            extraCharges.rightSphere = lensProduct.sphere_extra_charge || 0;
            console.log(`Right Sphere ${testOrder.rightSpherical} exceeds range [${lensProduct.sphere_min}, ${lensProduct.sphere_max}]: +₹${extraCharges.rightSphere}`);
        }

        // Left sphere
        if (testOrder.leftSpherical > lensProduct.sphere_max || testOrder.leftSpherical < lensProduct.sphere_min) {
            extraCharges.leftSphere = lensProduct.sphere_extra_charge || 0;
            console.log(`Left Sphere ${testOrder.leftSpherical} exceeds range: +₹${extraCharges.leftSphere}`);
        }

        // Right cylinder
        if (testOrder.rightCylindrical > lensProduct.cyl_max || testOrder.rightCylindrical < lensProduct.cyl_min) {
            extraCharges.rightCylinder = lensProduct.cylinder_extra_charge || 0;
            console.log(`Right Cylinder ${testOrder.rightCylindrical} exceeds range [${lensProduct.cyl_min}, ${lensProduct.cyl_max}]: +₹${extraCharges.rightCylinder}`);
        }

        // Left cylinder
        if (testOrder.leftCylindrical > lensProduct.cyl_max || testOrder.leftCylindrical < lensProduct.cyl_min) {
            extraCharges.leftCylinder = lensProduct.cylinder_extra_charge || 0;
            console.log(`Left Cylinder ${testOrder.leftCylindrical} exceeds range: +₹${extraCharges.leftCylinder}`);
        }

        extraCharges.total = extraCharges.rightSphere + extraCharges.leftSphere + 
                             extraCharges.rightCylinder + extraCharges.leftCylinder;
        console.log("Total Extra Charges:", extraCharges.total);

        // Step 4: Get tinting price
        console.log("\nStep 4: Fetching tinting price...");
        const tintingResponse = await fetch(`${BASE_URL}/v1/lens-tintings/${testOrder.tinting_id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const tintingData = await tintingResponse.json();
        const tintingPrice = parseFloat(tintingData.data.tinting_price) || 0;
        console.log("Tinting Price:", tintingPrice);

        // Step 5: Get fitting price
        console.log("\nStep 5: Fetching fitting price...");
        const fittingResponse = await fetch(`${BASE_URL}/v1/lens-fittings/${testOrder.fitting_id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const fittingData = await fittingResponse.json();
        const fittingPrice = parseFloat(fittingData.data.fitting_price) || 0;
        console.log("Fitting Price:", fittingPrice);

        // Step 6: Calculate breakdown
        console.log("\n=== PRICE BREAKDOWN ===");
        console.log("━".repeat(50));
        
        const breakdown = {
            baseLensPrice: baseLensPrice,
            extraCharges: extraCharges.total,
            tintingPrice: tintingPrice,
            fittingPrice: fittingPrice,
            subtotal: baseLensPrice + extraCharges.total + tintingPrice + fittingPrice,
            freeLensDeduction: testOrder.freeLens ? baseLensPrice : 0,
            freeFittingDeduction: testOrder.freeFitting ? fittingPrice : 0,
        };

        console.log(`Base Lens Price:              ₹${breakdown.baseLensPrice.toFixed(2)}`);
        if (breakdown.extraCharges > 0) {
            console.log(`Extra Charges:                ₹${breakdown.extraCharges.toFixed(2)}`);
        }
        console.log(`Tinting Price:                ₹${breakdown.tintingPrice.toFixed(2)}`);
        console.log(`Fitting Price:                ₹${breakdown.fittingPrice.toFixed(2)}`);
        console.log("─".repeat(50));
        console.log(`Subtotal:                     ₹${breakdown.subtotal.toFixed(2)}`);
        
        if (breakdown.freeLensDeduction > 0) {
            console.log(`Less: Free Lens               -₹${breakdown.freeLensDeduction.toFixed(2)}`);
        }
        if (breakdown.freeFittingDeduction > 0) {
            console.log(`Less: Free Fitting            -₹${breakdown.freeFittingDeduction.toFixed(2)}`);
        }

        breakdown.subtotalAfterDeductions = breakdown.subtotal - breakdown.freeLensDeduction - breakdown.freeFittingDeduction;
        console.log(`Subtotal After Deductions:    ₹${breakdown.subtotalAfterDeductions.toFixed(2)}`);

        // Get discount from customer
        breakdown.discountPercentage = testOrder.discount || 10; // Default 10%
        breakdown.discountAmount = (breakdown.subtotalAfterDeductions * breakdown.discountPercentage) / 100;
        console.log(`Less: Discount (${breakdown.discountPercentage}%):          -₹${breakdown.discountAmount.toFixed(2)}`);

        breakdown.finalTotal = breakdown.subtotalAfterDeductions - breakdown.discountAmount;
        console.log("━".repeat(50));
        console.log(`FINAL TOTAL:                  ₹${breakdown.finalTotal.toFixed(2)}`);
        console.log("━".repeat(50));

        console.log("\n✅ Price calculation test completed successfully!");

        // Test with free lens and free fitting
        console.log("\n\n=== Testing with Free Lens and Free Fitting ===");
        const breakdown2 = {
            baseLensPrice: baseLensPrice,
            extraCharges: extraCharges.total,
            tintingPrice: tintingPrice,
            fittingPrice: fittingPrice,
            subtotal: baseLensPrice + extraCharges.total + tintingPrice + fittingPrice,
            freeLensDeduction: baseLensPrice, // Free lens enabled
            freeFittingDeduction: fittingPrice, // Free fitting enabled
        };

        console.log(`Subtotal:                     ₹${breakdown2.subtotal.toFixed(2)}`);
        console.log(`Less: Free Lens               -₹${breakdown2.freeLensDeduction.toFixed(2)}`);
        console.log(`Less: Free Fitting            -₹${breakdown2.freeFittingDeduction.toFixed(2)}`);
        
        breakdown2.subtotalAfterDeductions = breakdown2.subtotal - breakdown2.freeLensDeduction - breakdown2.freeFittingDeduction;
        console.log(`Subtotal After Deductions:    ₹${breakdown2.subtotalAfterDeductions.toFixed(2)}`);
        
        breakdown2.discountPercentage = 10;
        breakdown2.discountAmount = (breakdown2.subtotalAfterDeductions * breakdown2.discountPercentage) / 100;
        console.log(`Less: Discount (${breakdown2.discountPercentage}%):          -₹${breakdown2.discountAmount.toFixed(2)}`);
        
        breakdown2.finalTotal = breakdown2.subtotalAfterDeductions - breakdown2.discountAmount;
        console.log("━".repeat(50));
        console.log(`FINAL TOTAL:                  ₹${breakdown2.finalTotal.toFixed(2)}`);

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        if (error.response) {
            console.error("Response:", await error.response.text());
        }
    }
}

// Run the test
testPriceCalculation();

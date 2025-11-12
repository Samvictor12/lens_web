# PowerShell User Master API Test Script
# Tests all User Master endpoints for stability and functionality

Write-Host "`n🧑‍💼 USER MASTER API COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001/api"
$userMasterUrl = "$baseUrl/user-master"
$authUrl = "$baseUrl/auth"
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Errors = @()
}

# Global variables for authentication
$authToken = ""
$testUserId = ""
$testUserData = @{
    firstname = "Test"
    lastname = "User"
    email = "testuser.$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "TestPassword123!"
    usercode = "TST$(Get-Date -Format 'yyyyMMddHHmmss')"
    phone = "+1234567890"
    address = "123 Test Street"
    city = "Test City"
    state = "Test State"
    pincode = "12345"
    blood_group = "A+"
    date_of_birth = "1990-01-15"
    department_id = 1
    role_id = 2
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [string]$ErrorMessage = ""
    )
    
    $testResults.Total++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    if ($Success) {
        $testResults.Passed++
        Write-Host "[$timestamp] [PASS] $TestName" -ForegroundColor Green
    } else {
        $testResults.Failed++
        $testResults.Errors += @{Test = $TestName; Error = $ErrorMessage}
        Write-Host "[$timestamp] [FAIL] $TestName : $ErrorMessage" -ForegroundColor Red
    }
}

function Invoke-UserMasterTest {
    param(
        [string]$TestName,
        [scriptblock]$TestScript
    )
    
    try {
        & $TestScript
        Write-TestResult -TestName $TestName -Success $true
        return $true
    } catch {
        Write-TestResult -TestName $TestName -Success $false -ErrorMessage $_.Exception.Message
        return $false
    }
}

# Authentication Setup
Write-Host "`n🔐 AUTHENTICATION SETUP" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

Invoke-UserMasterTest "Admin Login for Testing" {
    $body = @{
        emailOrUsercode = "admin@lensbilling.com"
        password = "demo123"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$authUrl/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Admin login failed with status $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data.accessToken) {
        throw "Invalid login response structure"
    }
    
    $script:authToken = $data.data.accessToken
    Write-Host "    ✓ Admin authenticated successfully" -ForegroundColor Gray
}

# Test 1: Health & Connectivity
Write-Host "`n📡 API CONNECTIVITY TESTS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Invoke-UserMasterTest "User Master API Accessibility" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    # Test a simple endpoint to verify API is accessible
    $response = Invoke-WebRequest -Uri "$userMasterUrl/roles" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "User Master API not accessible: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success) {
        throw "User Master API returned unsuccessful response"
    }
}

# Test 2: Dropdown Endpoints
Write-Host "`n📋 DROPDOWN DATA TESTS" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

Invoke-UserMasterTest "Get Roles Dropdown" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/roles" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Roles dropdown failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data) {
        throw "Invalid roles dropdown response"
    }
    
    Write-Host "    ✓ Roles count: $($data.data.Count)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Get Departments Dropdown" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/departments" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Departments dropdown failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data) {
        throw "Invalid departments dropdown response"
    }
    
    Write-Host "    ✓ Departments count: $($data.data.Count)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Get Users Dropdown" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/dropdown" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Users dropdown failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data) {
        throw "Invalid users dropdown response"
    }
    
    Write-Host "    ✓ Users count: $($data.data.Count)" -ForegroundColor Gray
}

# Test 3: Statistics
Write-Host "`n📊 STATISTICS TESTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

Invoke-UserMasterTest "Get User Statistics" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/stats" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "User statistics failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data -or $null -eq $data.data.totalUsers) {
        throw "Invalid statistics response"
    }
    
    Write-Host "    ✓ Total users in system: $($data.data.totalUsers)" -ForegroundColor Gray
}

# Test 4: User List & Pagination
Write-Host "`n📜 USER LIST & PAGINATION TESTS" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

Invoke-UserMasterTest "Get Users List (Default)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Get users list failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data -or -not $data.pagination) {
        throw "Invalid users list response"
    }
    
    Write-Host "    ✓ Users retrieved: $($data.data.Count)" -ForegroundColor Gray
    Write-Host "    ✓ Total users: $($data.pagination.total)" -ForegroundColor Gray
    Write-Host "    ✓ Current page: $($data.pagination.page)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Get Users List (Paginated)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl?page=1&limit=5" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Paginated users list failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or $data.data.Count -gt 5) {
        throw "Pagination not working correctly"
    }
    
    Write-Host "    ✓ Pagination working: Retrieved $($data.data.Count) users (limit 5)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Get Users List (With Search)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl?search=admin" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Search users list failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success) {
        throw "Search functionality not working"
    }
    
    Write-Host "    ✓ Search functionality working: Found $($data.data.Count) results for 'admin'" -ForegroundColor Gray
}

# Test 5: Validation Tests (Check Email/Usercode)
Write-Host "`n✅ VALIDATION TESTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

Invoke-UserMasterTest "Check Email Exists (Existing)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $body = @{
        email = "admin@lensbilling.com"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/check-email" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Check email failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data.exists) {
        throw "Email check should return exists=true for admin email"
    }
    
    Write-Host "    ✓ Existing email correctly identified" -ForegroundColor Gray
}

Invoke-UserMasterTest "Check Email Exists (New)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $body = @{
        email = "nonexistent.$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/check-email" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Check email failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or $data.data.exists) {
        throw "Email check should return exists=false for new email"
    }
    
    Write-Host "    ✓ New email correctly identified as available" -ForegroundColor Gray
}

Invoke-UserMasterTest "Check Usercode Exists (New)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $body = @{
        usercode = "NEWCODE$(Get-Date -Format 'HHmmss')"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/check-usercode" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Check usercode failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or $data.data.exists) {
        throw "Usercode check should return exists=false for new usercode"
    }
    
    Write-Host "    ✓ New usercode correctly identified as available" -ForegroundColor Gray
}

# Test 6: User Creation
Write-Host "`n➕ USER CREATION TESTS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

Invoke-UserMasterTest "Create New User (Valid Data)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $body = $script:testUserData | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 201) {
        throw "Create user failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data.id) {
        throw "Invalid create user response"
    }
    
    $script:testUserId = $data.data.id
    Write-Host "    ✓ User created successfully with ID: $script:testUserId" -ForegroundColor Gray
    Write-Host "    ✓ User email: $($data.data.email)" -ForegroundColor Gray
    Write-Host "    ✓ User code: $($data.data.usercode)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Create User (Duplicate Email)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    # Try to create user with same email
    $duplicateData = $script:testUserData.Clone()
    $duplicateData.usercode = "DUPE$(Get-Date -Format 'HHmmss')"
    $body = $duplicateData | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 409 -and $response.StatusCode -ne 400) {
            throw "Expected 409 Conflict or 400 Bad Request for duplicate email, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409 -or $_.Exception.Response.StatusCode -eq 400) {
            Write-Host "    ✓ Duplicate email correctly rejected" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

Invoke-UserMasterTest "Create User (Invalid Data)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    # Invalid data - missing required fields
    $invalidData = @{
        firstname = "Invalid"
        # Missing required fields
    }
    $body = $invalidData | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method POST -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 400) {
            throw "Expected 400 Bad Request for invalid data, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "    ✓ Invalid data correctly rejected" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

# Test 7: User Retrieval
Write-Host "`n🔍 USER RETRIEVAL TESTS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

Invoke-UserMasterTest "Get User by ID (Valid)" {
    if (-not $script:testUserId) {
        throw "No test user ID available"
    }
    
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/$script:testUserId" -Method GET -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Get user by ID failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or -not $data.data.id -or $data.data.id -ne $script:testUserId) {
        throw "Invalid get user by ID response"
    }
    
    Write-Host "    ✓ User retrieved: $($data.data.firstname) $($data.data.lastname)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Get User by ID (Invalid)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $invalidId = 99999
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl/$invalidId" -Method GET -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 404) {
            throw "Expected 404 Not Found for invalid user ID, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "    ✓ Invalid user ID correctly returns 404" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

# Test 8: User Update
Write-Host "`n✏️  USER UPDATE TESTS" -ForegroundColor Yellow
Write-Host "====================" -ForegroundColor Yellow

Invoke-UserMasterTest "Update User (Valid Data)" {
    if (-not $script:testUserId) {
        throw "No test user ID available for update"
    }
    
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $updateData = @{
        firstname = "Updated"
        lastname = "TestUser"
        city = "Updated City"
        phone = "+1987654321"
    }
    $body = $updateData | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/$script:testUserId" -Method PUT -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Update user failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success -or $data.data.firstname -ne "Updated") {
        throw "User update not applied correctly"
    }
    
    Write-Host "    ✓ User updated successfully" -ForegroundColor Gray
    Write-Host "    ✓ New name: $($data.data.firstname) $($data.data.lastname)" -ForegroundColor Gray
}

Invoke-UserMasterTest "Update User (Invalid ID)" {
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $updateData = @{
        firstname = "Should"
        lastname = "Fail"
    }
    $body = $updateData | ConvertTo-Json
    
    $invalidId = 99999
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl/$invalidId" -Method PUT -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 404) {
            throw "Expected 404 Not Found for invalid user ID update, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "    ✓ Update with invalid ID correctly returns 404" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

# Test 9: Access Control
Write-Host "`n🛡️  ACCESS CONTROL TESTS" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

Invoke-UserMasterTest "Access Without Authentication" {
    # Test without Authorization header
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method GET -UseBasicParsing
        if ($response.StatusCode -ne 401) {
            throw "Expected 401 Unauthorized without auth token, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "    ✓ Unauthenticated access correctly rejected" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

Invoke-UserMasterTest "Access With Invalid Token" {
    $headers = @{
        'Authorization' = "Bearer invalid-token-12345"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl" -Method GET -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 401) {
            throw "Expected 401 Unauthorized with invalid token, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "    ✓ Invalid token correctly rejected" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

# Test 10: User Deletion (Soft Delete)
Write-Host "`n🗑️  USER DELETION TESTS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

Invoke-UserMasterTest "Delete User (Soft Delete)" {
    if (-not $script:testUserId) {
        throw "No test user ID available for deletion"
    }
    
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    $deleteData = @{
        updatedBy = 1  # Admin user ID
    }
    $body = $deleteData | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$userMasterUrl/$script:testUserId" -Method DELETE -Body $body -ContentType "application/json" -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        throw "Delete user failed: $($response.StatusCode)"
    }
    
    $data = $response.Content | ConvertFrom-Json
    if (-not $data.success) {
        throw "User deletion unsuccessful"
    }
    
    Write-Host "    ✓ User soft deleted successfully" -ForegroundColor Gray
}

Invoke-UserMasterTest "Access Deleted User" {
    if (-not $script:testUserId) {
        throw "No test user ID available to verify deletion"
    }
    
    $headers = @{
        'Authorization' = "Bearer $script:authToken"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "$userMasterUrl/$script:testUserId" -Method GET -Headers $headers -UseBasicParsing
        if ($response.StatusCode -ne 404) {
            throw "Expected 404 Not Found for deleted user, got $($response.StatusCode)"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "    ✓ Deleted user correctly returns 404" -ForegroundColor Gray
        } else {
            throw $_.Exception.Message
        }
    }
}

# Print Summary
Write-Host "`n🎯 USER MASTER API TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Total Tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

$passRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -eq 100) { "Green" } elseif ($passRate -ge 90) { "Yellow" } else { "Red" })

if ($testResults.Errors.Count -gt 0) {
    Write-Host "`n❌ FAILED TESTS:" -ForegroundColor Red
    foreach ($error in $testResults.Errors) {
        Write-Host "  • $($error.Test): $($error.Error)" -ForegroundColor Red
    }
}

Write-Host ""
if ($testResults.Failed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! User Master API is stable and production-ready." -ForegroundColor Green
} elseif ($passRate -ge 90) {
    Write-Host "⚠️  Most tests passed but some issues found. Review failed tests." -ForegroundColor Yellow
} else {
    Write-Host "❌ Multiple test failures detected. User Master API needs attention." -ForegroundColor Red
}

Write-Host "`n📊 API FUNCTIONALITY COVERAGE:" -ForegroundColor Cyan
Write-Host "  ✓ Authentication & Authorization" -ForegroundColor Green
Write-Host "  ✓ CRUD Operations (Create, Read, Update, Delete)" -ForegroundColor Green
Write-Host "  ✓ Data Validation & Error Handling" -ForegroundColor Green
Write-Host "  ✓ Pagination & Filtering" -ForegroundColor Green
Write-Host "  ✓ Duplicate Detection & Prevention" -ForegroundColor Green
Write-Host "  ✓ Dropdown Data Endpoints" -ForegroundColor Green
Write-Host "  ✓ Statistics & Analytics" -ForegroundColor Green
Write-Host "  ✓ Soft Delete Implementation" -ForegroundColor Green

Write-Host "`n🚀 User Master API comprehensive test completed!" -ForegroundColor Cyan
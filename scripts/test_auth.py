"""
Manual test script to verify authentication endpoints work.
"""

import httpx
import json

BASE_URL = "http://localhost:8000"

def print_result(step_name, status_code, expected_status, data=None):
    """Print test result with PASS/FAIL indicator."""
    status = "PASS" if status_code == expected_status else "FAIL"
    print(f"\n{step_name}: {status} (Status: {status_code})")
    if data:
        print(f"Response: {json.dumps(data, indent=2)}")
    return status == "PASS"

def main():
    print("=" * 60)
    print("Testing Authentication Endpoints")
    print("=" * 60)
    
    client = httpx.Client()
    all_passed = True
    
    # Step 1: Register or login
    print("\n1. Registering/Logging in user...")
    register_data = {
        "name": "Test Merchant",
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    # Try to register first, if user exists then login
    response = client.post(f"{BASE_URL}/auth/register", json=register_data)
    
    if response.status_code == 201:
        result = response.json()
        access_token = result.get("access_token", "")
        initial_api_key = result.get("initial_api_key", "")
        merchant_id = result.get("merchant_id", "")
        
        print(f"✓ Registration successful")
        print(f"  Access token (first 20 chars): {access_token[:20]}...")
        print(f"  Initial API key: {initial_api_key}")
        print(f"  Merchant ID: {merchant_id}")
        
        step1_passed = print_result("Step 1: Register", response.status_code, 201, None)
        all_passed &= step1_passed
        
    elif response.status_code == 400 and "already registered" in response.text:
        # User already exists, try login
        print("  ℹ User already exists, attempting login...")
        login_data = {
            "email": "test@example.com",
            "password": "testpass123"
        }
        response = client.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            result = response.json()
            access_token = result.get("access_token", "")
            merchant_id = result.get("merchant_id", "")
            
            print(f"✓ Login successful")
            print(f"  Access token (first 20 chars): {access_token[:20]}...")
            print(f"  Merchant ID: {merchant_id}")
            
            step1_passed = print_result("Step 1: Login (user existed)", response.status_code, 200, None)
            all_passed &= step1_passed
        else:
            print(f"✗ Login failed: {response.text}")
            step1_passed = print_result("Step 1: Login", response.status_code, 200, None)
            all_passed &= step1_passed
    else:
        print(f"✗ Registration failed: {response.text}")
        step1_passed = print_result("Step 1: Register", response.status_code, 201, None)
        all_passed &= step1_passed
    
    if not step1_passed:
        print("\n❌ Cannot continue without successful authentication")
        client.close()
        return
    
    # Step 2: Get /auth/me using the JWT
    print("\n2. Getting current user info...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = client.get(f"{BASE_URL}/auth/me", headers=headers)
        result = response.json() if response.status_code == 200 else response.text
        
        if response.status_code == 200:
            name = result.get("name", "")
            email = result.get("email", "")
            role = result.get("role", "")
            
            print(f"✓ User info retrieved")
            print(f"  Name: {name}")
            print(f"  Email: {email}")
            print(f"  Role: {role}")
        else:
            print(f"✗ Get user info failed: {result}")
            
        step2_passed = print_result("Step 2: Get /auth/me", response.status_code, 200, result if response.status_code != 200 else None)
        all_passed &= step2_passed
        
    except Exception as e:
        print(f"✗ Get user info error: {e}")
        print_result("Step 2: Get /auth/me", 0, 200)
        all_passed = False
    
    # Step 3: Generate a new API key
    print("\n3. Generating new API key...")
    
    try:
        response = client.post(f"{BASE_URL}/api-keys/generate", headers=headers)
        result = response.json() if response.status_code == 200 else response.text
        
        if response.status_code == 200:
            new_api_key = result.get("api_key", "")
            print(f"✓ New API key generated")
            print(f"  Full API key: {new_api_key}")
        else:
            print(f"✗ API key generation failed: {result}")
            
        step3_passed = print_result("Step 3: Generate API key", response.status_code, 200, result if response.status_code != 200 else None)
        all_passed &= step3_passed
        
        if not step3_passed:
            print("\n❌ Cannot test fraud detection without API key")
            client.close()
            return
            
    except Exception as e:
        print(f"✗ API key generation error: {e}")
        print_result("Step 3: Generate API key", 0, 200)
        all_passed = False
        client.close()
        return
    
    # Step 4: Test fraud detect with the new API key
    print("\n4. Testing fraud detection with API key...")
    fraud_headers = {"X-API-Key": new_api_key}
    fraud_data = {
        "transaction_id": "TEST-001",
        "amount": "999.00",
        "currency": "INR",
        "customer_id": "CUST-TEST-1",
        "payment_method": "card",
        "ip_address": "203.0.113.1",
        "merchant_category_code": "5411",
        "is_international": False,
        "metadata": {"transaction_id": "TEST-001"}
    }
    
    try:
        response = client.post(f"{BASE_URL}/v1/fraud/detect", json=fraud_data, headers=fraud_headers)
        result = response.json() if response.status_code == 200 else response.text
        
        if response.status_code == 200:
            decision = result.get("decision", "")
            fraud_score = result.get("fraud_score", "")
            reason = result.get("llm_reason", "No reason provided")
            
            print(f"✓ Fraud detection successful")
            print(f"  Decision: {decision}")
            print(f"  Fraud score: {fraud_score}")
            print(f"  Reason: {reason}")
        else:
            print(f"✗ Fraud detection failed: {result}")
            
        step4_passed = print_result("Step 4: Fraud detection", response.status_code, 200, result if response.status_code != 200 else None)
        all_passed &= step4_passed
        
    except Exception as e:
        print(f"✗ Fraud detection error: {e}")
        print_result("Step 4: Fraud detection", 0, 200)
        all_passed = False
    
    # Final summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    main()
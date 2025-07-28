#!/usr/bin/env python3
"""
Uptime Kuma API Key Authentication Example
This script demonstrates how to use API key authentication to add monitors
"""

import requests
import json
import sys

# Configuration
UPTIME_KUMA_URL = "http://localhost:3001"
API_KEY = "ukundefined_YrB5ObUOOOpRw8lWUYEf0HR5-rUAluXo4b-8kXwv"  # Replace with your actual API key

def add_monitor_with_api_key(monitor_config):
    """Add a monitor using API key authentication"""
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    try:
        response = requests.post(
            f"{UPTIME_KUMA_URL}/api/monitor",
            headers=headers,
            json=monitor_config,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "message": result.get('msg', 'Success'),
                "monitor_id": result.get('monitorID'),
                "data": result
            }
        else:
            return {
                "success": False,
                "message": f"HTTP {response.status_code}",
                "error": response.json() if response.text else "No response body"
            }
            
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "message": "Request failed",
            "error": str(e)
        }

def main():
    print("=== Uptime Kuma API Key Authentication Test ===")
    print(f"Server URL: {UPTIME_KUMA_URL}")
    print(f"API Key: {API_KEY}")
    print()
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ Error: Please replace YOUR_API_KEY_HERE with your actual API key")
        print("   You can get an API key from the Uptime Kuma dashboard:")
        print("   1. Login to the dashboard")
        print("   2. Go to Settings → API Keys")
        print("   3. Create a new API key")
        print("   4. Copy the generated key and replace it in this script")
        sys.exit(1)
    
    # Test monitor configurations
    test_monitors = [
        {
            "name": "Test HTTP Monitor",
            "type": "http",
            "url": "https://httpbin.org/status/200",
            "interval": 60,
            "maxretries": 3,
            "timeout": 10,
            "active": True,
            "accepted_statuscodes": ["200-299"],
            "description": "Test monitor created via API key authentication"
        },
        {
            "name": "GitHub API Monitor", 
            "type": "http",
            "url": "https://api.github.com/status",
            "interval": 120,
            "maxretries": 2,
            "timeout": 15,
            "active": True,
            "method": "GET",
            "headers": '{"User-Agent": "UptimeKuma-API-Test"}',
            "accepted_statuscodes": ["200"],
            "description": "GitHub API status monitor"
        }
    ]
    
    # Test adding monitors
    for i, monitor in enumerate(test_monitors, 1):
        print(f"Test {i}: Adding '{monitor['name']}'")
        result = add_monitor_with_api_key(monitor)
        
        if result["success"]:
            print(f"✅ Success: {result['message']}")
            print(f"   Monitor ID: {result['monitor_id']}")
        else:
            print(f"❌ Failed: {result['message']}")
            if 'error' in result:
                print(f"   Error: {result['error']}")
        
        print()
    
    print("=== Test Complete ===")
    print()
    print("API Key Authentication Features:")
    print("✅ Secure authentication without exposing user credentials")
    print("✅ API keys can be created/revoked independently") 
    print("✅ Support for expiration dates")
    print("✅ Individual API key activation/deactivation")
    print("✅ Works alongside JWT token authentication")

if __name__ == "__main__":
    main()

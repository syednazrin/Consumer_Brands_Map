from app import app

with app.test_client() as client:
    # Test /api/data
    r = client.get('/api/data')
    data = r.get_json()
    print('=== /api/data ===')
    print('Status:', r.status_code)
    print('Response type:', type(data))
    if isinstance(data, dict):
        print('Has features:', 'features' in data)
        if 'features' in data:
            print('Features count:', len(data['features']))
            if len(data['features']) > 0:
                print('First feature keys:', list(data['features'][0].keys()))
                print('First feature properties:', list(data['features'][0].get('properties', {}).keys()))
        if 'error' in data:
            print('ERROR:', data.get('error'))
            print('Message:', data.get('message'))
    else:
        print('Response:', str(data)[:200])
    
    print('\n=== /api/categories ===')
    r2 = client.get('/api/categories')
    data2 = r2.get_json()
    print('Status:', r2.status_code)
    print('Categories count:', len(data2) if isinstance(data2, list) else 'N/A')
    if isinstance(data2, list) and len(data2) > 0:
        print('First category:', data2[0])

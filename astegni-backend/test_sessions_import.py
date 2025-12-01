"""Test that tutor_sessions_endpoints imports successfully"""
try:
    from tutor_sessions_endpoints import router
    print('SUCCESS: tutor_sessions_endpoints.py imports successfully')
    print(f'Router has {len(router.routes)} routes:')
    for route in router.routes:
        print(f'  - {list(route.methods)} {route.path}')
except Exception as e:
    print(f'ERROR: {e}')
    import traceback
    traceback.print_exc()

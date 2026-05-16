from services.cache import set_cache, get_cache, delete_cache, clear_all_cache

def test_cache_operations():
    res = set_cache("test_key", {"data": 123}, ttl=60)
    
    val = get_cache("test_key")
    if res:
        assert val == {"data": 123}
    else:
        assert val is None
        
    del_res = delete_cache("test_key")
    if res:
        assert del_res is True
        
    clear_all_cache()

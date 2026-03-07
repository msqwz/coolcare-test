import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

supabase = create_client(url, key)

res = supabase.table("users").select("id, name, phone, latitude, longitude").execute()
for u in res.data:
    if u['latitude'] or u['longitude']:
        print(f"User: {u['name']} ({u['phone']}) -> Lat: {u['latitude']}, Lng: {u['longitude']}")

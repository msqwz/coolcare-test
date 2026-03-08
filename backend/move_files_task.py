import os
import shutil

base_dir = r"c:\Users\Пользователь\Desktop\coolcare-main-main\backend"

migrations_dir = os.path.join(base_dir, "migrations")
scripts_dir = os.path.join(base_dir, "scripts")

os.makedirs(migrations_dir, exist_ok=True)
os.makedirs(scripts_dir, exist_ok=True)

for f in ["create_audit_log_schema.sql", "get_admin_stats.sql", "supabase_schema.sql"]:
    src = os.path.join(base_dir, f)
    dst = os.path.join(migrations_dir, f)
    if os.path.exists(src):
        os.rename(src, dst)
        print(f"Moved {f} to migrations/")

for f in ["add_columns.py", "generate_keys.py", "get_coords.py"]:
    src = os.path.join(base_dir, f)
    dst = os.path.join(scripts_dir, f)
    if os.path.exists(src):
        os.rename(src, dst)
        print(f"Moved {f} to scripts/")

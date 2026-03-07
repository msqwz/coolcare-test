import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Загружаем окружение из backend/.env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, 'backend', '.env')
load_dotenv(ENV_PATH)

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ Ошибка: SUPABASE_URL или SUPABASE_KEY не найдены в backend/.env")
    sys.exit(1)

supabase: Client = create_client(URL, KEY)

def check_build_status():
    dist_path = os.path.join(BASE_DIR, 'dispatcher', 'dist')
    if not os.path.exists(dist_path):
        print("⚠️  ПРЕДУПРЕЖДЕНИЕ: Папка 'dispatcher/dist' не найдена.")
        print("   Это значит, что Диспетчерская еще не собрана.")
        print("   Запустите деплой еще раз или выполните: cd dispatcher && npm run build")
    else:
        print("✅ Папка 'dispatcher/dist' найдена.")

def promote_user(phone: str):
    check_build_status()
    print(f"\n🔍 Поиск пользователя с телефоном: {phone}...")
    
    # Пытаемся получить пользователя
    res = supabase.table("users").select("*").eq("phone", phone).execute()
    
    if not res.data:
        print(f"❌ Пользователь с номером {phone} не найден.")
        return

    user = res.data[0]
    user_id = user['id']
    
    print(f"✅ Найден: {user.get('name', 'Без имени')} (ID: {user_id})")
    
    try:
        print(f"🆙 Назначаю роль 'admin'...")
        update_res = supabase.table("users").update({"role": "admin"}).eq("id", user_id).execute()
        print(f"🎉 Успех! Теперь пользователь {phone} является администратором.")
    except Exception as e:
        print(f"❌ Ошибка при обновлении: {e}")
        print("\n💡 Вероятно, колонка 'role' еще не создана в базе данных.")
        print("💡 Пожалуйста, запустите этот SQL запрос в Supabase SQL Editor:")
        print("\n   ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'master';\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python promote_admin.py +79991234567")
    else:
        promote_user(sys.argv[1])

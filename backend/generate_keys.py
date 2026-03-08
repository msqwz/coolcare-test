import os
import base64
import ecdsa

def generate_vapid_keys():
    # Generate keys using NIST256p curve
    vk = ecdsa.SigningKey.generate(curve=ecdsa.NIST256p)
    private_key = vk.to_string()
    
    # Format public key with 0x04 prefix for uncompressed keys
    public_key = b'\x04' + vk.get_verifying_key().to_string()
    
    # Encode keys using URL-safe base64 without padding
    private_b64 = base64.urlsafe_b64encode(private_key).decode('utf-8').rstrip('=')
    public_b64 = base64.urlsafe_b64encode(public_key).decode('utf-8').rstrip('=')
    
    # Check if keys are already in .env
    env_path = 'c:\\Users\\Пользователь\\Desktop\\coolcare-main-main\\backend\\.env'
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'VAPID_PUBLIC_KEY=' in content:
                print('Keys already exist in .env')
                return
    except FileNotFoundError:
        print('Warning: .env file not found at', env_path)
        
    print('Generated VAPID Keys:')
    print(f'VAPID_PUBLIC_KEY={public_b64}')
    print(f'VAPID_PRIVATE_KEY={private_b64}')
    
    # Append to .env
    with open(env_path, 'a', encoding='utf-8') as f:
        f.write(f'\n# Push Notifications VAPID Keys\n')
        f.write(f'VAPID_PUBLIC_KEY={public_b64}\n')
        f.write(f'VAPID_PRIVATE_KEY={private_b64}\n')
        
    print('\nSuccessfully appended keys to .env file')

if __name__ == '__main__':
    generate_vapid_keys()

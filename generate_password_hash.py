import bcrypt
import getpass

def hash_password(password: str) -> str:
    # Matches the logic in Backend/api/routes/admin.py
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def main():
    print("Password Hash Generator")
    print("-----------------------")
    
    password = getpass.getpass("Enter password to hash: ")
    if not password:
        print("Password cannot be empty.")
        return

    hashed = hash_password(password)
    print("\nGenerated Hash:")
    print(hashed)
    print("\nYou can update this hash in your database for the user 'password_hash' column.")

if __name__ == "__main__":
    main()

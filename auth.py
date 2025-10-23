from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory users
users = {
    "admin": pwd_context.hash("admin123"[:72])
}

def authenticate_user(username: str, password: str):
    if username in users and pwd_context.verify(password, users[username]):
        return True
    return False

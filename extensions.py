from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = Mail()
limiter = Limiter(key_func=get_remote_address, default_limits=["60 per minute"])

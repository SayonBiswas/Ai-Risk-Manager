"""
Email service using fastapi-mail with Resend SMTP.
"""

from fastapi_mail import FastMail, MessageSchema, MessageType
from fastapi_mail.config import ConnectionConfig

from app.core.config import get_settings

settings = get_settings()

# Configure email connection for Resend SMTP
email_config = ConnectionConfig(
    MAIL_USERNAME=settings.resend_api_key,
    MAIL_PASSWORD=settings.resend_api_key,
    MAIL_FROM=settings.mail_from,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_PORT=587,
    MAIL_SERVER="smtp.resend.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

fastmail = FastMail(email_config)


class EmailService:
    """Service for sending emails via Resend SMTP."""

    @staticmethod
    async def send_reset_email(to_email: str, merchant_name: str, reset_url: str) -> None:
        """Send a password reset email to a merchant.
        
        Args:
            to_email: Recipient email address
            merchant_name: Name of the merchant
            reset_url: Password reset URL with token
        """
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #f9f9f9;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                h1 {{
                    color: #2c3e50;
                    margin-bottom: 20px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #3498db;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 20px 0;
                }}
                .button:hover {{
                    background-color: #2980b9;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Reset Your AI Risk Manager Password</h1>
                <p>Hi {merchant_name},</p>
                <p>We received a request to reset your password for your AI Risk Manager account.</p>
                <p>Click the button below to reset your password:</p>
                <p>
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="{reset_url}">{reset_url}</a></p>
                <p>This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.</p>
                <div class="footer">
                    <p>AI Risk Manager - Fraud Detection & Risk Management</p>
                </div>
            </div>
        </body>
        </html>
        """

        message = MessageSchema(
            subject="Reset your AI Risk Manager password",
            recipients=[to_email],
            body=html_template,
            subtype=MessageType.html,
        )

        await fastmail.send_message(message)

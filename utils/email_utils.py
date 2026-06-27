import os
import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders

import json
from cryptography.fernet import Fernet

DATA_FOLDER = "data"

KEY_FILE = os.path.join(
    DATA_FOLDER,
    "secret.key"
)

SETTINGS_FILE = os.path.join(
    DATA_FOLDER,
    "email_settings.enc"
)

def get_key():

    try:

        if not os.path.exists(KEY_FILE):

            key = Fernet.generate_key()

            with open(KEY_FILE, "wb") as f:
                f.write(key)

        with open(KEY_FILE, "rb") as f:
            key = f.read()

        Fernet(key)  # validate key

        return key

    except:

        key = Fernet.generate_key()

        with open(KEY_FILE, "wb") as f:
            f.write(key)

        return key


def load_settings():

    if not os.path.exists(SETTINGS_FILE):
        print("Settings file not found!")
        return {}

    key = get_key()

    fernet = Fernet(key)

    with open(SETTINGS_FILE, "rb") as f:
        encrypted = f.read()

    decrypted = fernet.decrypt(encrypted)

    settings = json.loads(
        decrypted.decode()
    )

    return settings

def generate_email_html(df, message):
    """
    Generates HTML body for the email.
    """

    table_html = df.to_html(
        index=False,
        border=0,
        classes="report-table",
        justify="center"
    )

    html = f"""
    <html>
    <head>

    <style>

    body {{
        font-family: Arial, sans-serif;
        color: #333;
    }}

    h2 {{
        color: #0077f4;
    }}

    .report-table {{
        border-collapse: collapse;
        width: 100%;
        margin-top: 20px;
    }}

    .report-table th {{
        background-color: #0077f4;
        color: white;
        padding: 10px;
        border: 1px solid #ddd;
    }}

    .report-table td {{
        border: 1px solid #ddd;
        padding: 8px;
        text-align: center;
    }}

    .report-table tr:nth-child(even) {{
        background-color: #f5f5f5;
    }}

    </style>

    </head>

    <body>

        <h2>CEP Memory Dashboard Report</h2>

        <p>{message}</p>

        {table_html}

        <br>
        <p>
        Please find the attached Excel report for complete analysis.
        </p>

    </body>
    </html>
    """

    return html

def save_chart_image(fig):
    """
    Saves plotly chart as PNG for email embedding.
    """

    os.makedirs("temp", exist_ok=True)

    chart_path = os.path.join("temp", "chart.png")

    fig.write_image(
        chart_path,
        width=1200,
        height=600
    )

    return chart_path

def send_report_email(df, fig, excel_path):

    settings = load_settings()

    sender_email = settings.get("sender_email")
    sender_password = settings.get("sender_password")
    to_email = settings.get("to")
    cc_email = settings.get("cc", "")
    subject = settings.get("subject", "CEP Memory Dashboard Report")
    message = settings.get("message", "")

    if not sender_email or not sender_password or not to_email:
        raise Exception("Email settings are incomplete.")

    html_body = generate_email_html(df, message)

    #chart_path = save_chart_image(fig)

    msg = MIMEMultipart("related")

    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    if cc_email:
        msg["Cc"] = cc_email

    alternative = MIMEMultipart("alternative")
    msg.attach(alternative)

    alternative.attach(
        MIMEText(html_body, "html")
    )

    # Attach chart image
    '''with open(chart_path, "rb") as f:
        img = MIMEImage(f.read())

    img.add_header(
        "Content-ID",
        "<chart_image>"
    )

    img.add_header(
        "Content-Disposition",
        "inline",
        filename="chart.png"
    )

    msg.attach(img)'''

    # Attach Excel file
    with open(excel_path, "rb") as f:

        attachment = MIMEBase(
            "application",
            "octet-stream"
        )

        attachment.set_payload(f.read())

    encoders.encode_base64(attachment)

    attachment.add_header(
        "Content-Disposition",
        f'attachment; filename="{os.path.basename(excel_path)}"'
    )

    msg.attach(attachment)

    recipients = [to_email]

    if cc_email:
        recipients.extend(
            [email.strip() for email in cc_email.split(",")]
        )

    with smtplib.SMTP(
        "smtp.office365.com",
        587
    ) as server:

        print("Connecting to Outlook SMTP...")
        server.starttls()

        print("Logging in...")
        server.login(
            sender_email,
            sender_password
        )

        print("Sending email...")
        server.sendmail(
            sender_email,
            recipients,
            msg.as_string()
        )
        print("Email sent successfully")